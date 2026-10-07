import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { playerHasAnyRole } from '@/lib/auth/hasAnyRole';
import { advanceBracketFromMatch } from '@/lib/bracket/advanceBracketFromMatch';
import { loadSeriesState } from '@/lib/overlay/match-series';
import { classifySeriesResult } from '@/lib/tournament/drawRule';
import type { Database } from '@/types/database.types';

type MatchUpdate = Database['public']['Tables']['matches']['Update'];
type MatchOutcome = Database['public']['Tables']['matches']['Row']['outcome'];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;

  // 1. ตรวจสอบ Idempotency Key
  const idempotencyKey = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'MISSING_IDEMPOTENCY_KEY: Idempotency-Key header is required' },
      { status: 400 }
    );
  }

  // 2. ตรวจสอบ Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!player) {
    return NextResponse.json({ error: 'Player profile not found' }, { status: 404 });
  }

  // 2.1 ตรวจสอบสิทธิ์ผู้พิจารณาชี้ขาดคะแนน (RBAC)
  // ดึงทุก role แล้วเช็ค some(...) — ผู้ใช้ที่มีหลาย role (ATHLETE + ADMIN) ต้องผ่าน
  if (!(await playerHasAnyRole(supabase, player.id))) {
    return NextResponse.json(
      { error: 'FORBIDDEN_ROLE: สิทธิ์ในการตัดสินชี้ขาดคะแนนจำกัดเฉพาะกรรมการหรือแอดมินระบบเท่านั้น' },
      { status: 403 }
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const useSeriesScore = body.use_series_score === true;
  let winner_team_id = typeof body.winner_team_id === 'string' ? body.winner_team_id : null;
  let outcome = (typeof body.outcome === 'string' ? body.outcome : 'NORMAL') as unknown as MatchOutcome;
  let score_a = typeof body.score_a === 'number' ? body.score_a : 0;
  let score_b = typeof body.score_b === 'number' ? body.score_b : 0;
  const rounds_won_a = typeof body.rounds_won_a === 'number' ? body.rounds_won_a : 0;
  const rounds_won_b = typeof body.rounds_won_b === 'number' ? body.rounds_won_b : 0;
  const result_source = typeof body.result_source === 'string' ? body.result_source : 'REFEREE';

  // 3. ดึงข้อมูล Match
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (match.status !== 'AWAITING_RESULT') {
    return NextResponse.json(
      { error: 'MATCH_NOT_AWAITING_RESULT: Match is not awaiting result' },
      { status: 422 }
    );
  }

  // 3.1 กันการยิงซ้ำด้วย Idempotency-Key เดิม
  const { data: duplicateTransition } = await supabase
    .from('match_state_transitions' as never)
    .select('id, state_snapshot')
    .eq('match_id', matchId)
    .contains('state_snapshot', { idempotency_key: idempotencyKey })
    .maybeSingle();

  if (duplicateTransition) {
    const { data: alreadyFinalized } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    return NextResponse.json(alreadyFinalized);
  }

  const adminSupabase = await createAdminClient();
  const nowIso = new Date().toISOString();

  // 4. ตรวจสอบ Consistency กับ Best-of — กติกาเสมอได้อยู่ที่ lib/tournament/drawRule.ts ที่เดียว
  const { data: stageRow } = match.stage_id
    ? await adminSupabase.from('tournament_stages').select('format').eq('id', match.stage_id).maybeSingle()
    : { data: null };
  const stageFormat = stageRow?.format ?? null;
  const SERIES_NOT_DECIDED = 'SERIES_NOT_DECIDED: ซีรีส์ยังไม่ตัดสิน หรือแมตช์นี้ต้องมีผู้ชนะ';
  const DRAW_NOT_ALLOWED = 'DRAW_NOT_ALLOWED: แมตช์นี้จบเสมอไม่ได้ หรือสกอร์ไม่ใช่ผลเสมอ';

  if (useSeriesScore) {
    // ปิดผลจากสกอร์แมพของซีรีส์ที่ห้องคุมบันทึกไว้ (ค่า winner/outcome/score ที่ส่งมาไม่ใช้)
    const series = await loadSeriesState(adminSupabase, matchId);
    if (!series || !series.seriesOver) {
      return NextResponse.json({ error: SERIES_NOT_DECIDED }, { status: 422 });
    }
    const classified = classifySeriesResult(stageFormat, match.best_of, series.winsA, series.winsB);
    if (classified === 'INVALID') {
      return NextResponse.json({ error: SERIES_NOT_DECIDED }, { status: 422 });
    }
    score_a = series.winsA;
    score_b = series.winsB;
    if (classified === 'DRAW') {
      winner_team_id = null;
      outcome = 'DRAW' as unknown as MatchOutcome;
    } else {
      winner_team_id = classified === 'A' ? match.team_a_id : match.team_b_id;
      outcome = 'NORMAL' as unknown as MatchOutcome;
    }
  } else if ((outcome as unknown as string) === 'NORMAL') {
    if (winner_team_id !== match.team_a_id && winner_team_id !== match.team_b_id) {
      return NextResponse.json({ error: 'WINNER_REQUIRED: ผลปกติต้องระบุทีมผู้ชนะ' }, { status: 422 });
    }
    const classified = classifySeriesResult(stageFormat, match.best_of, score_a, score_b);
    if (classified !== (winner_team_id === match.team_a_id ? 'A' : 'B')) {
      return NextResponse.json(
        { error: 'RESULT_INCONSISTENT_WITH_GAMES: Winner must win majority of best_of games' },
        { status: 422 }
      );
    }
  } else if ((outcome as unknown as string) === 'DRAW') {
    if (winner_team_id !== null || classifySeriesResult(stageFormat, match.best_of, score_a, score_b) !== 'DRAW') {
      return NextResponse.json({ error: DRAW_NOT_ALLOWED }, { status: 422 });
    }
  }

  // 5. ปิด Match เป็น COMPLETED
  const matchUpdatePayload: MatchUpdate = {
    winner_team_id,
    outcome,
    score_a,
    score_b,
    rounds_won_a,
    rounds_won_b,
    status: 'COMPLETED',
    ended_at: nowIso,
    updated_at: nowIso,
  };

  const { data: updatedMatch, error: updateErr } = await adminSupabase
    .from('matches')
    .update(matchUpdatePayload)
    .eq('id', matchId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 6. อัปเดต Bracket Node และส่งต่อผู้ชนะ/ผู้แพ้ (ตรรกะกลางเดียวกับ /report ที่กัปตันรายงานตรงกัน)
  if (winner_team_id) {
    const advance = await advanceBracketFromMatch(adminSupabase, {
      matchId,
      teamAId: match.team_a_id,
      teamBId: match.team_b_id,
      winnerTeamId: winner_team_id,
      nowIso,
    });
    if (!advance.ok) {
      console.error('[matches/result] advance bracket failed', { matchId, error: advance.error });
    }
  }

  // 7. Audit Log
  await adminSupabase.from('match_state_transitions' as never).insert({
    match_id: match.id,
    from_status: match.status,
    to_status: 'COMPLETED',
    trigger_source: result_source === 'GAME_API' ? 'GAME_API' : 'REFEREE',
    actor_id: player?.id || null,
    reason: `Match result reported: ${outcome || 'NORMAL'}`,
    state_snapshot: {
      winner_team_id,
      outcome,
      score_a,
      score_b,
      idempotency_key: idempotencyKey,
    },
  } as never);

  // 8. Refresh Materialized View & Cache Revalidation
  try {
    await adminSupabase.rpc('refresh_team_analytics' as never);
    revalidateTag('team-analytics', 'default');
  } catch {
    // swallow analytics freshness error
  }

  return NextResponse.json(updatedMatch);
}