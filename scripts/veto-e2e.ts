// scripts/veto-e2e.ts
// ตัวช่วยทดสอบ E2E ของ Veto Step Engine (แทน scripts/finish_veto.js ที่ใส่ 7 สเต็ปตายตัวข้าม Engine)
// ทำงานผ่านตรรกะเดียวกับ API: ลำดับ/ทีม/เวลาจาก tournament_stages.veto_format, ตรวจคำสั่งด้วย validateAction,
// เติม DECIDER อัตโนมัติ และปิด Veto (VETO -> LIVE) ด้วย resolveVetoProgress
//
// ใช้:
//   npx tsx scripts/veto-e2e.ts                         dry-run (อ่านอย่างเดียว ด้วย anon key) แสดงสิ่งที่จะเกิด
//   npx tsx scripts/veto-e2e.ts --maps Split,Abyss,Ascent,Bind --apply
//                                                       เขียนจริงด้วย service role: ทำทุกสเต็ปที่เหลือแทนกัปตัน แล้วเติม DECIDER
// ตัวเลือก:
//   --match <matchId>   แมตช์เป้าหมาย (ค่าเริ่มต้น: แมตช์ทดสอบ a7606ae5-d83a-46f5-b422-652d5017b644)
//   --maps a,b,c,d      แมพของสเต็ป BAN/PICK ที่เหลือ ตามลำดับ (ไม่ใส่/ไม่ครบ = ใช้แมพแรกที่ยังเหลือใน Pool)
//   --apply             เขียนจริง (ต้องมี SUPABASE_SERVICE_ROLE_KEY ใน .env.local และสถานะแมตช์เป็น VETO)
//   --ready             (ใช้คู่กับ --apply) ทำให้ทั้งสองทีม Ready แทนการกดที่หน้า Lobby: SCHEDULED -> READY_CHECK -> VETO
//                       ไม่แตะรายชื่อสมาชิกทีม (การกดปุ่ม Ready ที่หน้าเว็บจะเพิ่มผู้กดเป็น CAPTAIN ของทีมนั้น) เริ่มนับเวลา 60 วินาทีของสเต็ปแรกทันที
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { asInsert, asUpdate } from '@/types/supabase-helpers';
import {
  currentStep,
  isVetoComplete,
  planAutoSteps,
  remainingMaps,
  teamIdForSide,
  validateAction,
  type VetoRowLike,
} from '@/lib/veto/engine';
import { loadVetoContext, resolveVetoProgress } from '@/lib/veto/service';

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

type Db = ReturnType<typeof createClient<Database>>;

// จำลองการกด Ready ของทั้งสองทีม (ขั้นตอนเดียวกับ POST /api/v1/matches/[id]/ready แต่ไม่ต้องล็อกอินและไม่เพิ่มสมาชิกทีม)
// SCHEDULED -> READY_CHECK (ทีม A Ready, ตั้ง forfeit_deadline_at 15 นาที) -> VETO (ทีม B Ready)
// trigger ใน DB บังคับลำดับ SCHEDULED -> READY_CHECK -> VETO จึงอัปเดตสองครั้ง พร้อมบันทึก match_state_transitions
async function readyBothTeams(db: Db, ctx: NonNullable<Awaited<ReturnType<typeof loadVetoContext>>>, apply: boolean) {
  const { match } = ctx;
  console.log('\nโหมด --ready: ทำให้ทั้งสองทีม Ready แล้วเข้าสู่ VETO');
  console.log(`  ทีม A ready_at: ${match.team_a_ready_at ?? '(ยังไม่ Ready)'}  |  ทีม B ready_at: ${match.team_b_ready_at ?? '(ยังไม่ Ready)'}`);

  if (match.status !== 'SCHEDULED' && match.status !== 'READY_CHECK') {
    const note = `สถานะแมตช์เป็น ${match.status} ใช้ --ready ได้เฉพาะ SCHEDULED หรือ READY_CHECK (รีเซ็ตแมตช์เป็น SCHEDULED ก่อน)`;
    if (apply) fail(note);
    console.log(`\n⚠ ${note}`);
  }
  if (ctx.config.source !== 'stage') fail('Stage นี้ไม่มี veto_format — แมตช์จะข้าม Veto ไป LIVE เอง ไม่ต้องใช้ --ready');
  if (ctx.rows.length > 0) {
    const note = `มีแถวใน map_vetoes อยู่แล้ว ${ctx.rows.length} แถว — ต้องล้างก่อนเริ่ม Veto ใหม่ (ไม่เช่นนั้นจะชน unique (match_id, step_order))`;
    if (apply) fail(note);
    console.log(`\n⚠ ${note}`);
  }

  console.log('\nแผน:');
  if (match.status === 'SCHEDULED') console.log('  1) SCHEDULED → READY_CHECK  (ทีม A Ready, ตั้ง forfeit_deadline_at = +15 นาที)');
  console.log('  2) READY_CHECK → VETO       (ทีม B Ready — เวลาถอยหลัง 60 วินาทีของสเต็ปแรกเริ่มนับจากตรงนี้)');
  console.log('  ไม่แตะตาราง team_members');

  if (!apply) {
    console.log('\nนี่คือ dry-run — ยังไม่ได้เขียนอะไร ถ้าต้องการเขียนจริงเพิ่ม --apply');
    return;
  }

  const t1 = new Date().toISOString();
  if (match.status === 'SCHEDULED') {
    const { data, error } = await db
      .from('matches')
      .update(
        asUpdate<'matches'>({
          status: 'READY_CHECK',
          team_a_ready_at: match.team_a_ready_at ?? t1,
          forfeit_deadline_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          updated_at: t1,
        })
      )
      .eq('id', match.id)
      .eq('status', 'SCHEDULED')
      .select('id');
    if (error) fail(`SCHEDULED → READY_CHECK ไม่สำเร็จ: ${error.message}`);
    if (!data || data.length === 0) fail('สถานะแมตช์เปลี่ยนไประหว่างรัน (ไม่ใช่ SCHEDULED แล้ว) — ลองรันใหม่');
    await db.from('match_state_transitions').insert({
      match_id: match.id,
      from_status: 'SCHEDULED',
      to_status: 'READY_CHECK',
      trigger_source: 'SYSTEM',
      reason: 'E2E helper: team A ready',
    });
    console.log('  ✓ SCHEDULED → READY_CHECK');
  }

  const t2 = new Date().toISOString();
  const { data, error } = await db
    .from('matches')
    .update(
      asUpdate<'matches'>({
        status: 'VETO',
        team_a_ready_at: match.team_a_ready_at ?? t1,
        team_b_ready_at: match.team_b_ready_at ?? t2,
        updated_at: t2,
      })
    )
    .eq('id', match.id)
    .eq('status', 'READY_CHECK')
    .select('id');
  if (error) fail(`READY_CHECK → VETO ไม่สำเร็จ: ${error.message}`);
  if (!data || data.length === 0) fail('สถานะแมตช์ไม่ใช่ READY_CHECK ตอนจะเข้า VETO — ตรวจสถานะแล้วลองใหม่');
  await db.from('match_state_transitions').insert({
    match_id: match.id,
    from_status: 'READY_CHECK',
    to_status: 'VETO',
    trigger_source: 'SYSTEM',
    reason: 'E2E helper: both teams ready',
  });
  console.log('  ✓ READY_CHECK → VETO');
  console.log('\nแมตช์เข้าสู่ VETO แล้ว — เปิด Overlay ดูเวลาถอยหลัง 60 วินาที แล้วรันต่อด้วย: npx tsx scripts/veto-e2e.ts --maps ... --apply');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const matchId = argValue('--match') ?? DEFAULT_MATCH_ID;
  const requestedMaps = (argValue('--maps') ?? '').split(',').map((m) => m.trim()).filter(Boolean);

  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = apply ? env.SUPABASE_SERVICE_ROLE_KEY : env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) fail(apply ? 'ไม่พบ SUPABASE_SERVICE_ROLE_KEY ใน .env.local (จำเป็นเมื่อใช้ --apply)' : 'ไม่พบ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local');

  const db = createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  console.log(`โหมด: ${apply ? 'APPLY (เขียนจริง ด้วย service role)' : 'DRY-RUN (อ่านอย่างเดียว ด้วย anon key)'}  |  แมตช์: ${matchId}`);

  const ctx = await loadVetoContext(db, matchId);
  if (!ctx) fail('ไม่พบแมตช์นี้');

  console.log(`\nสถานะแมตช์ : ${ctx.match.status}`);
  console.log(`Map Pool    : ${ctx.pool.join(', ') || '(ว่าง)'}`);
  console.log(`veto_format : ${ctx.config.steps.map((s) => `${s.step}.${s.action}${s.team ? `(${s.team})` : ''}`).join(' → ')}  |  ${ctx.config.timeLimitSeconds ?? 'ไม่จับเวลา'} วินาที/สเต็ป  |  แหล่งที่มา: ${ctx.config.source}`);
  console.log(`Veto ที่มีแล้ว: ${ctx.rows.length ? ctx.rows.map((r) => `${r.step_order}:${r.action}:${r.map_name}`).join(' | ') : '(ยังไม่มี)'}`);

  if (ctx.problems.length > 0) fail(`ตั้งค่า Veto ของ Stage ไม่ถูกต้อง: ${ctx.problems.join('; ')}`);

  if (process.argv.includes('--ready')) {
    await readyBothTeams(db, ctx, apply);
    return;
  }

  if (ctx.match.status !== 'VETO') {
    const note = `สถานะแมตช์เป็น ${ctx.match.status} ไม่ใช่ VETO (ต้องให้ทั้งสองทีมกด Ready จนเข้า VETO ก่อน)`;
    if (apply) fail(note);
    console.log(`\n⚠ ${note} — dry-run นี้แสดงเฉพาะสิ่งที่จะเกิดถ้าอยู่ในสถานะ VETO`);
  }

  // 1) ถ้ามีสเต็ปที่หมดเวลาไปแล้ว ให้ระบบเติมก่อน (เหมือนที่ API ทำก่อนตรวจคำสั่ง)
  let rows: VetoRowLike[] = ctx.rows;
  if (apply) {
    const caught = await resolveVetoProgress(db, matchId);
    if (caught && caught.inserted.length > 0) {
      console.log(`\nระบบเติมสเต็ปที่หมดเวลาให้แล้ว: ${caught.inserted.map((r) => `${r.step_order}:${r.action}:${r.map_name}`).join(', ')}`);
    }
    if (caught?.complete) {
      console.log('\n✓ Veto ครบแล้ว' + (caught.finalized ? ' และสถานะเปลี่ยนเป็น LIVE' : ''));
      return;
    }
    rows = (await loadVetoContext(db, matchId))?.rows ?? rows;
  }

  // 2) วางแผนสเต็ปที่ต้องมีคนเลือก (BAN/PICK) ตามลำดับใน veto_format
  const plan: Array<{ step: number; action: string; side: 'A' | 'B'; map: string }> = [];
  const working: VetoRowLike[] = [...rows];
  let mapIdx = 0;
  for (;;) {
    const step = currentStep(ctx.config, working);
    if (!step || step.action === 'DECIDER' || !step.team) break;

    const requested = requestedMaps[mapIdx];
    mapIdx += 1;
    const mapName = requested ?? remainingMaps(ctx.pool, working)[0];
    if (!mapName) fail(`ไม่มีแมพเหลือสำหรับสเต็ป ${step.step}`);

    const check = validateAction(ctx.config, ctx.pool, working, { side: step.team, action: step.action, mapName }, ctx.vetoStartMs);
    if (!check.ok) fail(`สเต็ป ${step.step} (${step.action} โดยทีม ${step.team}) แมพ "${mapName}" ใช้ไม่ได้: ${check.code} — ${check.message}`);

    plan.push({ step: step.step, action: step.action, side: step.team, map: check.mapName });
    working.push({
      step_order: step.step,
      action: step.action,
      team_id: teamIdForSide(step.team, ctx.match.team_a_id, ctx.match.team_b_id),
      map_name: check.mapName,
      created_at: new Date().toISOString(),
      was_auto: false,
    });
  }
  if (requestedMaps.length > plan.length) console.log(`\n⚠ ระบุแมพมา ${requestedMaps.length} แมพ แต่มีสเต็ปให้เลือกแค่ ${plan.length} สเต็ป (แมพที่เกินถูกข้าม)`);

  // 3) DECIDER ที่ระบบจะเติม (ผลคงที่จาก seed = matchId + สเต็ป จึงตรงกับที่ระบบจริงจะเลือก)
  const decider = planAutoSteps(ctx.config, ctx.pool, working, {
    nowMs: Date.now(),
    vetoStartMs: ctx.vetoStartMs,
    teamAId: ctx.match.team_a_id,
    teamBId: ctx.match.team_b_id,
    seed: matchId,
  }).filter((r) => r.action === 'DECIDER');

  console.log('\nแผน:');
  plan.forEach((p) => console.log(`  สเต็ป ${p.step}  ${p.action.padEnd(6)} ทีม ${p.side}  →  ${p.map}`));
  decider.forEach((d) => console.log(`  สเต็ป ${d.step_order}  DECIDER       (ระบบ)  →  ${d.map_name}`));
  if (plan.length === 0 && decider.length === 0) console.log('  (ไม่มีสเต็ปที่ต้องทำ)');

  if (!apply) {
    console.log('\nนี่คือ dry-run — ยังไม่ได้เขียนอะไร ถ้าต้องการเขียนจริงเพิ่ม --apply');
    return;
  }

  // 4) เขียนจริง: สเต็ป BAN/PICK เหมือน POST /veto/action แล้วให้ระบบเติม DECIDER และปิด Veto
  for (const p of plan) {
    const { error } = await db.from('map_vetoes').insert(
      asInsert<'map_vetoes'>({
        match_id: matchId,
        step_order: p.step,
        action: p.action,
        team_id: teamIdForSide(p.side, ctx.match.team_a_id, ctx.match.team_b_id),
        map_name: p.map,
        was_auto: false,
      })
    );
    if (error) fail(`บันทึกสเต็ป ${p.step} ไม่สำเร็จ: ${error.message} (${error.code ?? '-'})`);
    console.log(`  ✓ บันทึกสเต็ป ${p.step} ${p.action} ${p.map}`);
  }

  const done = await resolveVetoProgress(db, matchId);
  const final = await loadVetoContext(db, matchId);
  console.log(`\nDECIDER: ${done?.inserted.filter((r) => r.action === 'DECIDER').map((r) => r.map_name).join(', ') || '(ไม่ได้เติม)'}`);
  console.log(`Veto ครบ: ${final && isVetoComplete(final.config, final.rows) ? 'ใช่' : 'ยังไม่ครบ'}  |  สถานะแมตช์: ${final?.match.status ?? '?'}`);
  console.log(`map_vetoes : ${final?.rows.map((r) => `${r.step_order}:${r.action}:${r.map_name}`).join(' | ')}`);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
