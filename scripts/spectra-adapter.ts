// scripts/spectra-adapter.ts
// ตัวเชื่อมสาย: ฟัง WebSocket ของ Spectra-Server (ข้อมูลเงิน/อาวุธ/เกราะ/อัลติจาก Overwolf GEP บนเครื่อง
// Observer) แล้วแปลง+ยิงต่อเข้า POST /api/v1/matches/[id]/telemetry ตัวเดิมที่ระบบเราใช้อยู่แล้ว
// (ช่องทางเดียวกับที่ OCR ใช้ส่ง HP — Overlay merge ข้อมูลจากหลายแหล่งด้วยชื่อผู้เล่นอัตโนมัติ)
//
// ต้องรันเป็น Node process แยกต่างหาก (ไม่ใช่ route ของ Next.js) เพราะ Vercel serverless function
// เปิด WebSocket ค้างไว้ยาวๆ ไม่ได้ — รันบนเครื่องไหนก็ได้ที่ต่อถึง Spectra-Server ได้ (เครื่อง Observer เอง
// หรือเครื่องแยกที่รัน Docker ของ Spectra-Server ก็ได้)
//
// ⚠️ ยังไม่เคยทดสอบกับ Spectra-Server จริง (ไม่มี Overwolf/Spectra ให้ทดสอบตอนที่เขียน) ต้องตั้งค่า Spectra
// Client+Server ให้ทำงานได้ก่อน แล้ว dry-run ดู log ให้แน่ใจว่าจับคู่ผู้เล่นถูกคนก่อนเชื่อบนแมตช์จริง
//
// ใช้:
//   npx tsx scripts/spectra-adapter.ts --match <matchId> --game <gameNumber> --token <observerToken>
//     [--spectra-url ws://localhost:5200] [--group-code <code>] [--base-url https://www.zodiacleaguetournaments.com]
//
// ตัวแปรที่ต้องมีใน .env.local (โหลดจากไฟล์เดียวกับที่สคริปต์อื่นในโปรเจกต์ใช้):
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (อ่านรายชื่อ+riot id ของแมตช์นี้)
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { io } from 'socket.io-client';
import { buildTelemetryPlayers, RoundTracker, riotIdKey, type RiotIdRosterEntry, type SpectraScoreboardEntry } from '@/lib/spectra/translate';

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return env;
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
    });
  return env;
}

function argValue(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

async function main() {
  const env = readEnv();
  const matchId = argValue('--match');
  const gameNumber = Number(argValue('--game', '1'));
  const observerToken = argValue('--token');
  const spectraUrl = argValue('--spectra-url', 'ws://localhost:5200');
  const groupCode = argValue('--group-code');
  const baseUrl = argValue('--base-url', 'https://www.zodiacleaguetournaments.com') ?? 'https://www.zodiacleaguetournaments.com';

  if (!matchId) fail('ต้องระบุ --match <matchId>');
  if (!observerToken) fail('ต้องระบุ --token <observerToken> (ออกจากหน้า Spectator Control ก่อน)');
  if (!groupCode) fail('ต้องระบุ --group-code <code> (Group Code เดียวกับที่ตั้งไว้ใน Spectra-Client)');

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) fail('ไม่พบ NEXT_PUBLIC_SUPABASE_URL / ANON KEY ใน .env.local');
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`🔎 โหลดรายชื่อ + Riot ID ของแมตช์ ${matchId} เกม ${gameNumber}...`);
  const { data: game, error: gameErr } = await supabase
    .from('match_games')
    .select('id')
    .eq('match_id', matchId)
    .eq('game_number', gameNumber)
    .maybeSingle();
  if (gameErr) fail(`โหลดข้อมูลเกมไม่สำเร็จ: ${gameErr.message}`);
  if (!game) fail(`ยังไม่มีแถวเกม ${gameNumber} ของแมตช์นี้ — ต้องล็อกรายชื่อผู้เล่น (Pre-Map Roster Lock) ก่อนรันสคริปต์นี้`);

  const { data: participants, error: partErr } = await supabase
    .from('match_participants')
    .select('player_id, team_id, players:player_id(display_name)')
    .eq('match_game_id', game.id);
  if (partErr) fail(`โหลดรายชื่อผู้เล่นไม่สำเร็จ: ${partErr.message}`);

  const playerIds = (participants ?? []).map((p) => p.player_id);
  const { data: accounts, error: accErr } = await supabase
    .from('game_accounts')
    .select('player_id, game_name, tag_line')
    .in('player_id', playerIds);
  if (accErr) fail(`โหลด Riot ID ไม่สำเร็จ: ${accErr.message}`);

  const rosterByRiotId = new Map<string, RiotIdRosterEntry>();
  for (const p of participants ?? []) {
    const account = (accounts ?? []).find((a) => a.player_id === p.player_id);
    const playerObj = Array.isArray(p.players) ? p.players[0] : p.players;
    const displayName = (playerObj as { display_name?: string } | null)?.display_name;
    if (!account || !displayName) continue;
    rosterByRiotId.set(riotIdKey(account.game_name, account.tag_line), { displayName, teamId: p.team_id ?? undefined });
  }

  if (rosterByRiotId.size === 0) {
    fail('ไม่พบ Riot ID ของผู้เล่นแมตช์นี้เลย — ต้องผูก Riot ID (game_accounts) ให้ผู้เล่นก่อนใช้สคริปต์นี้ได้');
  }
  console.log(`✅ พร้อมจับคู่ผู้เล่น ${rosterByRiotId.size}/${playerIds.length} คน (ที่เหลือไม่มี Riot ID ผูกไว้ — ข้ามไป ไม่ error)`);

  const telemetryUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/matches/${matchId}/telemetry`;
  let sentFrames = 0;
  let roundEndSent = false;
  const tracker = new RoundTracker();
  let latestScoreboard: SpectraScoreboardEntry[] = [];

  console.log(`🔌 เชื่อมต่อ Spectra-Server ที่ ${spectraUrl} (group code: ${groupCode})...`);
  const socket = io(spectraUrl, { reconnection: true });

  socket.on('connect', () => {
    console.log('✅ เชื่อมต่อ Spectra-Server สำเร็จ — ส่ง logon...');
    socket.emit('logon', { groupCode });
  });

  socket.on('connect_error', (err: Error) => {
    console.error(`⚠️ เชื่อมต่อ Spectra-Server ไม่ได้: ${err.message} — จะลองใหม่อัตโนมัติ`);
  });

  // Overwolf GEP push events: spike_detonated / spike_defused ยิงทันทีกลางรอบ
  socket.on('spike_detonated', () => {
    tracker.onSpikeDetonated();
    console.log('💣 spike_detonated event received');
  });

  socket.on('spike_defused', () => {
    tracker.onSpikeDefused();
    console.log('🛡️ spike_defused event received');
  });

  // Overwolf GEP info update: round_phase เปลี่ยนเป็น "end" = รอบจบ → resolve win condition
  socket.on('round_phase', async (phase: string) => {
    if (phase !== 'end' || roundEndSent) return;

    const outcome = tracker.resolveRoundEnd(latestScoreboard, rosterByRiotId);
    if (!outcome) {
      console.warn(`⚠️ รอบ ${tracker.currentRound} จบแต่ resolve winner ไม่ได้ — ข้อมูล scoreboard ไม่พอ`);
      return;
    }

    roundEndSent = true;
    const roundEvent = {
      stage: 'ROUND_ENDED' as const,
      game_number: gameNumber,
      round_number: tracker.currentRound || 1,
      winner_team_id: outcome.winnerTeamId,
      win_condition: outcome.winCondition,
    };

    console.log(`🏁 รอบ ${roundEvent.round_number} จบ — ทีมชนะ: ${outcome.winnerTeamId} (${outcome.winCondition})`);

    try {
      const res = await fetch(telemetryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
        body: JSON.stringify({ timestamp: Date.now(), round_event: roundEvent, players: buildTelemetryPlayers(latestScoreboard, rosterByRiotId) }),
      });
      if (!res.ok) {
        console.error(`⚠️ ส่ง round_event ล้มเหลว (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error(`⚠️ ยิง round_event ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  socket.on('match_data', async (payload: { scoreboard?: SpectraScoreboardEntry[]; roundNumber?: number }) => {
    const scoreboard = payload?.scoreboard;
    if (!Array.isArray(scoreboard) || scoreboard.length === 0) return;

    latestScoreboard = scoreboard;

    // ตรวจจับรอบใหม่: roundNumber เปลี่ยน = รอบใหม่เริ่มแล้ว
    if (typeof payload.roundNumber === 'number') {
      const prevRound = tracker.currentRound;
      tracker.advanceRound(payload.roundNumber);
      if (tracker.currentRound > prevRound) {
        roundEndSent = false;
      }
    }

    const players = buildTelemetryPlayers(scoreboard, rosterByRiotId);
    if (players.length === 0) return;

    try {
      const res = await fetch(telemetryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
        body: JSON.stringify({ timestamp: Date.now(), players }),
      });
      sentFrames += 1;
      if (!res.ok) {
        console.error(`⚠️ ส่ง telemetry ล้มเหลว (HTTP ${res.status}) — ถ้าเป็น 401 ให้ออก Observer Token ใหม่`);
      } else if (sentFrames % 20 === 1) {
        console.log(`📡 ส่งแล้ว ${sentFrames} เฟรม — ล่าสุด ${players.length} คน: ${players.map((p) => p.name).join(', ')}`);
      }
    } catch (err) {
      console.error(`⚠️ ยิง telemetry ไม่สำเร็จ (เครือข่าย): ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  process.on('SIGINT', () => {
    console.log('\n👋 ปิดการเชื่อมต่อ...');
    socket.disconnect();
    process.exit(0);
  });
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
