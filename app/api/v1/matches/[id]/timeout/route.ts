import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { loadSeriesState } from '@/lib/overlay/match-series';
import { asUpdate } from '@/types/supabase-helpers';
import {
  TACTICAL_SECONDS,
  activeTimeout,
  countTacticalUsed,
  decideTimeout,
  isOvertime,
  tacticalLimit,
  type TimeoutEvent,
} from '@/lib/match/timeouts';

type RouteParams = { params: Promise<{ id: string }> | { id: string } };
type AdminClient = ReturnType<typeof createAdminClient>;

const TimeoutBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('START'),
    type: z.enum(['TACTICAL', 'TECHNICAL']),
    team: z.enum(['A', 'B']).optional(),
    reason: z.string().max(200).optional(),
  }),
  z.object({ action: z.literal('RESUME') }),
]);

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function loadTimeoutView(admin: AdminClient, matchId: string) {
  const state = await loadSeriesState(admin, matchId);
  if (!state) return null;

  const { data: transitionRows } = await admin
    .from('match_state_transitions')
    .select('to_status, created_at, reason, state_snapshot')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  const events = (transitionRows ?? []) as unknown as TimeoutEvent[];

  const overtime = isOvertime(state.match.rounds_won_a, state.match.rounds_won_b);
  const gameNumber = state.currentGameNumber ?? 0;
  const status = String(state.match.status);

  return {
    status,
    gameNumber,
    overtime,
    used: countTacticalUsed(events, { gameNumber, overtime }),
    active: activeTimeout(status, events),
  };
}

function toPayload(view: NonNullable<Awaited<ReturnType<typeof loadTimeoutView>>>) {
  return {
    status: view.status,
    current_game_number: view.gameNumber || null,
    overtime: view.overtime,
    tactical_limit: tacticalLimit(view.overtime),
    tactical_used: view.used,
    active: view.active,
  };
}

// สถานะ Time out ปัจจุบัน — ไม่ต้องล็อกอิน (จอถ่ายทอดและแผงคุมอ่านค่านี้)
export async function GET(_req: Request, { params }: RouteParams) {
  const { id: matchId } = await params;
  const view = await loadTimeoutView(createAdminClient(), matchId);
  if (!view) return errorResponse('MATCH_NOT_FOUND', 'ไม่พบข้อมูลแมตช์', 404);
  return NextResponse.json(toPayload(view));
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const auth = await requireBroadcastRole(supabase);
    if (!auth.ok) return auth.response;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse('BAD_REQUEST', 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง', 400);
    }
    const parsed = TimeoutBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'ข้อมูลไม่ถูกต้องตามรูปแบบ (action / type / team / reason)', 400);
    }
    const body = parsed.data;

    const admin = createAdminClient();
    const view = await loadTimeoutView(admin, matchId);
    if (!view) return errorResponse('MATCH_NOT_FOUND', 'ไม่พบข้อมูลแมตช์', 404);

    const nowIso = new Date().toISOString();
    const channel = `match-realtime-${matchId}`;

    if (body.action === 'START') {
      const decision = decideTimeout({
        status: view.status,
        type: body.type,
        team: body.team,
        reason: body.reason,
        used: view.used,
        overtime: view.overtime,
      });
      if (!decision.ok) return errorResponse(decision.code, decision.message, decision.httpStatus);

      const startedAt = nowIso;
      const endsAt =
        decision.durationSeconds === null
          ? null
          : new Date(Date.parse(startedAt) + decision.durationSeconds * 1000).toISOString();

      // เงื่อนไข status = 'LIVE' ซ้ำที่ฐานข้อมูล กันกดซ้อนกัน 2 คน
      const { data: pausedRows, error: pauseErr } = await admin
        .from('matches')
        .update(asUpdate<'matches'>({ status: 'PAUSED', updated_at: nowIso }))
        .eq('id', matchId)
        .eq('status', 'LIVE')
        .select('id');
      if (pauseErr) return errorResponse('TRANSACTION_FAILED', pauseErr.message, 500);
      if (!pausedRows || pausedRows.length === 0) {
        return errorResponse('MATCH_NOT_LIVE', 'ขอ Time out ได้เฉพาะตอนแมตช์สถานะ LIVE', 422);
      }

      const reasonText =
        decision.type === 'TACTICAL' ? `Tactical Timeout · ทีม ${decision.team}` : decision.reason;
      const { error: auditErr } = await admin.from('match_state_transitions').insert({
        match_id: matchId,
        from_status: 'LIVE',
        to_status: 'PAUSED',
        trigger_source: 'REFEREE',
        actor_id: auth.playerId,
        reason: reasonText,
        state_snapshot: {
          event: 'TIMEOUT',
          pause_type: decision.type,
          team: decision.team,
          game_number: view.gameNumber,
          overtime: view.overtime,
          duration_seconds: decision.type === 'TACTICAL' ? TACTICAL_SECONDS : null,
          started_at: startedAt,
          ends_at: endsAt,
        },
      });
      if (auditErr) console.error('[matches/timeout] audit insert failed', auditErr.message);

      const next = await loadTimeoutView(admin, matchId);
      const active = next?.active ?? null;
      await admin.channel(channel).send({
        type: 'broadcast',
        event: 'match_status_changed',
        payload: { status: 'PAUSED', timeout: active, updated_at: nowIso },
      });
      return NextResponse.json(next ? toPayload(next) : { status: 'PAUSED', active });
    }

    // RESUME — ห้ามแตะ started_at
    const { data: resumedRows, error: resumeErr } = await admin
      .from('matches')
      .update(asUpdate<'matches'>({ status: 'LIVE', updated_at: nowIso }))
      .eq('id', matchId)
      .eq('status', 'PAUSED')
      .select('id');
    if (resumeErr) return errorResponse('TRANSACTION_FAILED', resumeErr.message, 500);
    if (!resumedRows || resumedRows.length === 0) {
      return errorResponse('MATCH_NOT_PAUSED', 'แมตช์ไม่ได้อยู่ในสถานะหยุดพัก (PAUSED)', 422);
    }

    const { error: resumeAuditErr } = await admin.from('match_state_transitions').insert({
      match_id: matchId,
      from_status: 'PAUSED',
      to_status: 'LIVE',
      trigger_source: 'REFEREE',
      actor_id: auth.playerId,
      reason: 'Resume หลัง Time out',
      state_snapshot: { event: 'TIMEOUT_RESUME', resumed_at: nowIso },
    });
    if (resumeAuditErr) console.error('[matches/timeout] resume audit insert failed', resumeAuditErr.message);

    await admin.channel(channel).send({
      type: 'broadcast',
      event: 'match_status_changed',
      payload: { status: 'LIVE', timeout: null, updated_at: nowIso },
    });

    const after = await loadTimeoutView(admin, matchId);
    return NextResponse.json(after ? toPayload(after) : { status: 'LIVE', active: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return errorResponse('SERVER_ERROR', message, 500);
  }
}
