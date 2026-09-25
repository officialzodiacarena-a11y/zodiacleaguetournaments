// scripts/spectra-adapter.ts
// ตัวเชื่อมสาย: ฟัง WebSocket ของ Spectra-Server (event `match_data` เดียว — ข้อมูลทั้งหมดรวมอยู่ใน
// JSON ก้อนใหญ่ ไม่มี event แยกสำหรับ spike/round_phase) แล้วแปลง+ยิงต่อเข้า
// POST /api/v1/matches/[id]/telemetry
//
// Spectra-Server protocol (จาก websocketOutgoing.ts):
//   - Overlay connect → emit "logon" พร้อม { groupCode }
//   - Server ตอบ "logon_success"
//   - Server ส่ง "match_data" ทุกครั้งที่ state เปลี่ยน (scoreboard, round phase, spike, score ฯลฯ)
//   - match_data payload คือ Match object ที่ strip ฟิลด์ sensitive ออก (groupSecret, replayLog)
//
// ต้องรันเป็น Node process แยกต่างหาก (Vercel serverless เปิด WebSocket ค้างไม่ได้)
//
// ใช้:
//   npx tsx scripts/spectra-adapter.ts --match <matchId> --game <gameNumber> --token <observerToken>
//     [--spectra-url ws://localhost:5200] [--group-code <code>] [--base-url https://www.zodiacleaguetournaments.com]
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { io } from 'socket.io-client';
import {
  RoundTracker,
  buildTelemetryPlayersFromMatchData,
  riotIdKey,
  type RiotIdRosterEntry,
  type SpectraMatchData,
} from '@/lib/spectra/translate';

function readEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
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
  const matchId = argValue('--match') ?? env.MATCH_ID;
  const gameNumber = Number(argValue('--game') ?? env.GAME_NUMBER ?? '1');
  const observerToken = argValue('--token') ?? env.OBSERVER_TOKEN;
  const spectraUrl = argValue('--spectra-url') ?? env.SPECTRA_URL ?? 'ws://localhost:5200';
  const groupCode = argValue('--group-code') ?? env.GROUP_CODE;
  const baseUrl = argValue('--base-url') ?? env.BASE_URL ?? 'https://www.zodiacleaguetournaments.com';

  if (!matchId) fail('ต้องระบุ --match <matchId> หรือตั้งค่า ENV: MATCH_ID');
  if (!observerToken) fail('ต้องระบุ --token <observerToken> หรือตั้งค่า ENV: OBSERVER_TOKEN');
  if (!groupCode) fail('ต้องระบุ --group-code <code> หรือตั้งค่า ENV: GROUP_CODE');

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  // ใช้ SERVICE_ROLE_KEY เพื่อทะลุ RLS (Row Level Security) ไปดึงข้อมูลบัญชีผู้เล่น
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) fail('ไม่พบ NEXT_PUBLIC_SUPABASE_URL / KEY ใน .env.local');
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
    rosterByRiotId.set(riotIdKey(account.game_name, account.tag_line), {
      displayName,
      teamId: p.team_id ?? undefined,
    });
  }

  if (rosterByRiotId.size === 0) {
    console.warn('⚠️ คำเตือน: ไม่พบ Riot ID ในระบบสำหรับแมตช์นี้เลย!');
    console.warn('🔧 [TEST MODE] สร้างรายชื่อผู้เล่นจำลอง (Player1#TH, Player2#TH) เพื่อให้ทดสอบระบบต่อได้...');
    rosterByRiotId.set('PLAYER1#TH', { displayName: 'Mock Player 1', teamId: 'mock-team-a' });
    rosterByRiotId.set('PLAYER2#TH', { displayName: 'Mock Player 2', teamId: 'mock-team-b' });
  } else {
    console.log(`✅ พร้อมจับคู่ผู้เล่น ${rosterByRiotId.size}/${playerIds.length} คน`);
  }

  const telemetryUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/matches/${matchId}/telemetry`;
  let sentFrames = 0;
  let lastSentRoundOutcome = -1;
  let unauthorizedCount = 0;
  let lastSentPlayersStr = '';
  const tracker = new RoundTracker();

  console.log(`🔌 เชื่อมต่อ Spectra-Server ที่ ${spectraUrl} (group code: ${groupCode})...`);
  const socket = io(spectraUrl, { reconnection: true });

  socket.on('connect', () => {
    console.log('✅ เชื่อมต่อ Spectra-Server สำเร็จ — ส่ง logon...');
    tracker.resetBaseline();
    socket.emit('logon', JSON.stringify({ groupCode }));
  });

  socket.on('logon_success', (msg: string) => {
    console.log(`✅ Logon สำเร็จ: ${msg}`);
  });

  socket.on('connect_error', (err: Error) => {
    console.error(`⚠️ เชื่อมต่อ Spectra-Server ไม่ได้: ${err.message} — จะลองใหม่อัตโนมัติ`);
  });

  socket.on('match_data', async (raw: string) => {
    let matchData: SpectraMatchData;
    try {
      matchData = JSON.parse(raw) as SpectraMatchData;
    } catch {
      console.error('⚠️ parse match_data ไม่ได้ — ข้ามเฟรมนี้');
      return;
    }

    if (!matchData.teams || matchData.teams.length < 2) return;

    // Build telemetry frames from nested teams[].players[]
    const players = buildTelemetryPlayersFromMatchData(matchData.teams, rosterByRiotId);

    // Check for round end
    const outcome = tracker.processMatchData(matchData, rosterByRiotId);

    // Build payload — always include round_number for server-side idempotency
    const roundNum = tracker.currentRound > 0 ? tracker.currentRound : 1;
    const payload: Record<string, unknown> = { timestamp: Date.now(), round_number: roundNum };
    if (players.length > 0) payload.players = players;

    if (outcome) {
      const outcomeRound = roundNum > 1 ? roundNum - 1 : 1;
      // Client-side idempotency: skip duplicate round outcome sends
      if (outcomeRound !== lastSentRoundOutcome) {
        payload.round_event = {
          stage: 'ROUND_ENDED' as const,
          game_number: gameNumber,
          round_number: outcomeRound,
          winner_team_id: outcome.winnerTeamId,
          win_condition: outcome.winCondition,
        };
        lastSentRoundOutcome = outcomeRound;
        console.log(`🏁 รอบ ${outcomeRound} จบ — ทีมชนะ: ${outcome.winnerTeamId} (${outcome.winCondition})`);
      }
    }

    if (!payload.players && !payload.round_event) return;

    // --- Debounce Logic (กันยิงซ้ำถ้าข้อมูลผู้เล่นไม่เปลี่ยนและไม่มีเหตุการณ์จบแมตช์) ---
    const currentPlayersStr = payload.players ? JSON.stringify(payload.players) : '';
    if (!payload.round_event && currentPlayersStr === lastSentPlayersStr) {
      return; // ไม่มีข้อมูลเปลี่ยน ข้ามการยิง API
    }

    try {
      const res = await fetch(telemetryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${observerToken}` },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        console.error(`⚠️ ส่ง telemetry ล้มเหลว (HTTP ${res.status})`);
        if (res.status === 401 || res.status === 403) {
          unauthorizedCount++;
          console.error(`🚨 Token อาจหมดอายุหรือผิดพลาด (ครั้งที่ ${unauthorizedCount}/3)`);
          if (unauthorizedCount >= 3) {
            fail('Token ผิดพลาดเกิน 3 ครั้ง บังคับปิดระบบเพื่อความปลอดภัย (กรุณาอัปเดต Token ใน .env)');
          }
        }
      } else {
        unauthorizedCount = 0; // รีเซ็ตตัวนับเมื่อสำเร็จ
        lastSentPlayersStr = currentPlayersStr; // จดจำข้อมูลที่เพิ่งส่งสำเร็จ
        sentFrames += 1;
        if (sentFrames % 20 === 1) {
          console.log(`📡 ส่งสำเร็จ ${sentFrames} เฟรม (อัปเดตล่าสุด: รอบ ${matchData.roundNumber} — ${matchData.roundPhase})`);
        }
      }
    } catch (err) {
      console.error(`⚠️ ยิง telemetry ไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  process.on('SIGINT', () => {
    console.log('\n👋 ปิดการเชื่อมต่อ...');
    socket.disconnect();
    process.exit(0);
  });
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
