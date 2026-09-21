import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { currentStep, isVetoComplete, teamIdForSide } from '@/lib/veto/engine';
import { loadVetoContext, summarizeVeto } from '@/lib/veto/service';

// สถานะ Veto ของแมตช์ (อ่านอย่างเดียว): ลำดับสเต็ปจาก tournament_stages.veto_format, สเต็ปปัจจุบัน + ทีมที่ต้องทำ + เวลาที่เหลือ
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: matchId } = await params;
  const ctx = await loadVetoContext(createAdminClient(), matchId);
  if (!ctx) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { config, pool, rows, match } = ctx;
  const complete = isVetoComplete(config, rows);
  const step = complete ? null : currentStep(config, rows);
  const summary = summarizeVeto(ctx);

  return NextResponse.json({
    match_id: match.id,
    status: match.status,
    map_pool: pool,
    veto_sequence: config.steps.map((s) => ({ step: s.step, action: s.action, team: s.team })),
    completed_steps: rows,
    current_step: step ? step.step : null,
    current_action: step ? step.action : null,
    current_team_id: step ? teamIdForSide(step.team, match.team_a_id, match.team_b_id) : null,
    selected_maps: rows.filter((r) => r.action === 'PICK' || r.action === 'DECIDER').map((r) => r.map_name),
    vetoed_maps: rows.map((r) => r.map_name),
    remaining_maps: summary.remaining,
    is_complete: complete,
    time_limit_seconds: config.timeLimitSeconds,
    current_step_deadline_at: summary.deadlineMs === null ? null : new Date(summary.deadlineMs).toISOString(),
    seconds_left: summary.secondsLeft,
    format_source: config.source,
    config_problems: ctx.problems,
  });
}
