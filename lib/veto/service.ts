// lib/veto/service.ts
// ชั้นฐานข้อมูลของ Veto Step Engine (ใช้ admin client — เรียกจาก Route Handler เท่านั้น)
// - loadVetoContext: อ่านแมตช์ + Stage (map_pool, veto_format) + แถว map_vetoes
// - resolveVetoProgress: เติมสเต็ปที่หมดเวลา (Auto-pick) และ DECIDER แล้วปิด Veto (VETO -> LIVE) เมื่อครบ — เรียกซ้ำได้ ปลอดภัย
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { asInsert, asUpdate } from '@/types/supabase-helpers';
import {
  currentDeadlineMs,
  isVetoComplete,
  parseVetoFormat,
  planAutoSteps,
  remainingMaps,
  validateConfig,
  vetoStartMsFromMatch,
  type PlannedVetoRow,
  type VetoConfig,
  type VetoRowLike,
} from '@/lib/veto/engine';

type Admin = SupabaseClient<Database>;

export interface VetoContext {
  match: {
    id: string;
    status: string;
    team_a_id: string | null;
    team_b_id: string | null;
    team_a_ready_at: string | null;
    team_b_ready_at: string | null;
    updated_at: string;
    stage_id: string | null;
  };
  config: VetoConfig;
  pool: string[];
  rows: VetoRowLike[];
  vetoStartMs: number;
  problems: string[];
}

export async function loadVetoContext(admin: Admin, matchId: string): Promise<VetoContext | null> {
  const { data: match, error } = await admin
    .from('matches')
    .select('id, status, team_a_id, team_b_id, team_a_ready_at, team_b_ready_at, updated_at, stage_id')
    .eq('id', matchId)
    .maybeSingle();
  if (error || !match) return null;

  const { data: stage } = match.stage_id
    ? await admin.from('tournament_stages').select('map_pool, veto_format').eq('id', match.stage_id).maybeSingle()
    : { data: null };

  const pool = Array.isArray(stage?.map_pool) ? (stage.map_pool as string[]).filter((m) => typeof m === 'string') : [];
  const config = parseVetoFormat(stage?.veto_format ?? null);

  const { data: rowData } = await admin
    .from('map_vetoes')
    .select('step_order, action, team_id, map_name, created_at, deadline_at, was_auto')
    .eq('match_id', matchId)
    .order('step_order', { ascending: true });

  return {
    match,
    config,
    pool,
    rows: (rowData ?? []) as VetoRowLike[],
    vetoStartMs: vetoStartMsFromMatch(match),
    problems: validateConfig(config, pool),
  };
}

// ปิด Veto: VETO -> LIVE (ครั้งเดียว — เงื่อนไข status = VETO กันการทำซ้ำเมื่อเรียกพร้อมกัน) พร้อมบันทึก match_state_transitions
export async function finalizeVeto(admin: Admin, matchId: string, reason: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data: updated } = await admin
    .from('matches')
    .update(asUpdate<'matches'>({ status: 'LIVE', started_at: nowIso, updated_at: nowIso }))
    .eq('id', matchId)
    .eq('status', 'VETO')
    .select('id');

  if (!updated || updated.length === 0) return false;

  await admin.from('match_state_transitions').insert({
    match_id: matchId,
    from_status: 'VETO',
    to_status: 'LIVE',
    trigger_source: 'SYSTEM',
    reason,
  });
  return true;
}

// ถ้ามีแถวของสเต็ปเดียวกันซ้ำ (เรียกพร้อมกันและฐานข้อมูลไม่มี unique) เก็บแถวเก่าสุด ลบส่วนเกิน
async function dedupeStep(admin: Admin, matchId: string, stepOrder: number) {
  const { data } = await admin
    .from('map_vetoes')
    .select('id, created_at')
    .eq('match_id', matchId)
    .eq('step_order', stepOrder)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (data && data.length > 1) {
    const extras = data.slice(1).map((r) => r.id);
    await admin.from('map_vetoes').delete().in('id', extras);
  }
}

async function insertPlanned(admin: Admin, matchId: string, rows: PlannedVetoRow[]): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    const { error } = await admin.from('map_vetoes').insert(asInsert<'map_vetoes'>({ match_id: matchId, ...row }));
    if (error) {
      // 23505 = มีสเต็ปนี้แล้ว (อีกคำขอทำไปก่อน) — หยุด ให้รอบถัดไปอ่านสถานะใหม่
      if (error.code === '23505') break;
      throw new Error(error.message);
    }
    inserted += 1;
    await dedupeStep(admin, matchId, row.step_order);
  }
  return inserted;
}

export interface VetoProgress {
  status: string;
  inserted: PlannedVetoRow[];
  complete: boolean;
  finalized: boolean;
  problems: string[];
}

// เติมสเต็ปที่ระบบต้องทำ ณ เวลา nowMs แล้วปิด Veto ถ้าครบ (ไม่ทำอะไรถ้าสถานะแมตช์ไม่ใช่ VETO)
export async function resolveVetoProgress(admin: Admin, matchId: string, nowMs: number = Date.now()): Promise<VetoProgress | null> {
  const ctx = await loadVetoContext(admin, matchId);
  if (!ctx) return null;

  if (ctx.match.status !== 'VETO') {
    return { status: ctx.match.status, inserted: [], complete: false, finalized: false, problems: ctx.problems };
  }
  if (ctx.problems.length > 0) {
    return { status: ctx.match.status, inserted: [], complete: false, finalized: false, problems: ctx.problems };
  }

  const planned = planAutoSteps(ctx.config, ctx.pool, ctx.rows, {
    nowMs,
    vetoStartMs: ctx.vetoStartMs,
    teamAId: ctx.match.team_a_id,
    teamBId: ctx.match.team_b_id,
    seed: matchId,
  });

  const insertedCount = planned.length > 0 ? await insertPlanned(admin, matchId, planned) : 0;
  const rowsAfter = planned.length > 0 ? ((await loadVetoContext(admin, matchId))?.rows ?? ctx.rows) : ctx.rows;
  const complete = isVetoComplete(ctx.config, rowsAfter);

  let finalized = false;
  if (complete) {
    const autoCount = planned.length;
    finalized = await finalizeVeto(admin, matchId, autoCount > 0 ? 'Veto completed (system auto-picked remaining steps)' : 'Veto process completed with decider map determined');
  }

  return { status: finalized ? 'LIVE' : ctx.match.status, inserted: planned.slice(0, insertedCount), complete, finalized, problems: [] };
}

// สรุปสถานะ Veto สำหรับ GET /veto
export function summarizeVeto(ctx: VetoContext, nowMs: number = Date.now()) {
  const deadlineMs = ctx.match.status === 'VETO' ? currentDeadlineMs(ctx.config, ctx.rows, ctx.vetoStartMs) : null;
  return {
    remaining: remainingMaps(ctx.pool, ctx.rows),
    deadlineMs,
    secondsLeft: deadlineMs === null ? null : Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000)),
  };
}
