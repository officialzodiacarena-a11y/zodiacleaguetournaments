// scripts/telemetry-e2e.ts
// ตัวช่วยทดสอบ E2E ของ Observer Bridge telemetry relay (POST /api/v1/matches/[id]/telemetry)
// จำลองเครื่องคนจับกล้องที่ยิงข้อมูล credits/weapon/armor/ult/hp เข้ามาทุกวินาที โดยไม่ต้องมีโปรแกรม Bridge จริง
//
// ใช้:
//   npx tsx scripts/telemetry-e2e.ts                      dry-run (แสดง payload ที่จะยิง ไม่แตะ DB/เครือข่าย)
//   npx tsx scripts/telemetry-e2e.ts --apply
//                                                          ตั้ง observer_token_hash ของแมตช์ทดสอบด้วย service role
//                                                          แล้วยิง telemetry จริงไปที่ --base-url ผ่าน HTTP (เหมือน Observer Bridge จริง)
// ตัวเลือก:
//   --match <matchId>   แมตช์เป้าหมาย (ค่าเริ่มต้น: แมตช์ทดสอบ a7606ae5-d83a-46f5-b422-652d5017b644)
//   --base-url <url>    โฮสต์ของ dev server (ค่าเริ่มต้น: http://localhost:3000)
//   --ticks <n>         จำนวนเฟรมที่ยิง ห่างกันเฟรมละ 1 วินาที (ค่าเริ่มต้น: 3)
//   --apply             เขียน token จริง (ต้องมี SUPABASE_SERVICE_ROLE_KEY ใน .env.local) แล้วยิง POST จริง
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { asUpdate } from '@/types/supabase-helpers';
import { generateObserverToken, hashObserverToken, withObserverTokenHash } from '@/lib/overlay/observer-token';
import type { TelemetryFrame } from '@/lib/overlay/telemetry-schema';

const DEFAULT_MATCH_ID = 'a7606ae5-d83a-46f5-b422-652d5017b644';

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
  });
  return env;
}

function argValue(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : null;
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

// เฟรมทดสอบ: สลับเงิน/อาวุธ/HP ทุก tick ให้เห็นว่า Buy Phase HUD อัปเดตจริง
function buildFrame(tick: number, playerNames: string[]): TelemetryFrame {
  return {
    players: playerNames.map((name, idx) => ({
      name,
      credits: Math.max(0, 4000 - tick * 800 - idx * 150),
      weapon: tick === 0 ? 'Classic' : idx % 2 === 0 ? 'Vandal' : 'Phantom',
      armor: tick === 0 ? 'NONE' : 'HEAVY',
      ultPoints: Math.min(7, tick + idx),
      ultMax: 7,
      hp: Math.max(0, 100 - tick * 20 - idx * 5),
      hpMax: 100,
    })),
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const matchId = argValue('--match') || DEFAULT_MATCH_ID;
  const baseUrl = argValue('--base-url') || 'http://localhost:3000';
  const ticks = Number(argValue('--ticks') || '3');
  const playerNames = ['Alpha#TH1', 'Bravo#TH1', 'Charlie#TH1', 'Delta#TH1', 'Echo#TH1'];

  console.log(`\n=== Observer Bridge Telemetry E2E ===`);
  console.log(`Match: ${matchId}`);
  console.log(`Mode: ${apply ? 'APPLY (เขียนจริง + ยิง HTTP จริง)' : 'DRY-RUN (แสดง payload เฉยๆ)'}\n`);

  if (!apply) {
    for (let tick = 0; tick < ticks; tick++) {
      console.log(`--- tick ${tick} ---`);
      console.log(JSON.stringify(buildFrame(tick, playerNames), null, 2));
    }
    console.log(`\n(dry-run เท่านั้น — ใส่ --apply เพื่อยิงจริงไปที่ ${baseUrl}/api/v1/matches/${matchId}/telemetry)`);
    return;
  }

  const env = readEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    fail('--apply ต้องมี NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local');
  }

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: match, error: findError } = await admin
    .from('matches')
    .select('id, format_config')
    .eq('id', matchId)
    .maybeSingle();
  if (findError) fail(`หาแมตช์ไม่เจอ: ${findError.message}`);
  if (!match) fail(`ไม่พบแมตช์ ${matchId}`);

  // ตั้ง token ทดสอบตรง ๆ ด้วย service role (ข้ามหน้า Spectator Control ที่ต้อง login referee จริง)
  const testToken = generateObserverToken();
  const { error: updateError } = await admin
    .from('matches')
    .update(asUpdate<'matches'>({ format_config: withObserverTokenHash(match!.format_config, hashObserverToken(testToken)) }))
    .eq('id', matchId);
  if (updateError) fail(`ตั้ง observer token ล้มเหลว: ${updateError.message}`);
  console.log(`✓ ตั้ง observer token ทดสอบแล้ว\n`);

  for (let tick = 0; tick < ticks; tick++) {
    const frame = buildFrame(tick, playerNames);
    const res = await fetch(`${baseUrl}/api/v1/matches/${matchId}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testToken}` },
      body: JSON.stringify(frame),
    });
    const json = await res.json().catch(() => ({}));
    console.log(`tick ${tick}: HTTP ${res.status} — ${JSON.stringify(json)}`);
    if (!res.ok) fail(`ยิง telemetry ล้มเหลวที่ tick ${tick}`);
    if (tick < ticks - 1) await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n✓ เสร็จแล้ว — เปิด /overlay/match/${matchId} ไว้ดูควรเห็น Buy Phase HUD อัปเดตตามเฟรมด้านบน`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
