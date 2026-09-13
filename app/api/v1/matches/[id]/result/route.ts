import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database.types';

type MatchUpdate = Database['public']['Tables']['matches']['Update'];
type MatchOutcome = Database['public']['Tables']['matches']['Row']['outcome'];

interface BracketNodeRow {
  id: string;
  winner_to_node_id: string | null;
  loser_to_node_id: string | null;
  bracket_type: string;
  team_a_id?: string | null;
  team_b_id?: string | null;
}

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
  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null)
    .single();

  const allowedRoles = ['REFEREE', 'ADMIN', 'SUPER_ADMIN'];
  if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN_ROLE: สิทธิ์ในการตัดสินชี้ขาดคะแนนจำกัดเฉพาะกรรมการหรือแอดมินระบบเท่านั้น' },
      { status: 403 }
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const winner_team_id = typeof body.winner_team_id === 'string' ? body.winner_team_id : null;
  const outcome = (typeof body.outcome === 'string' ? body.outcome : 'NORMAL') as unknown as MatchOutcome;
  const score_a = typeof body.score_a === 'number' ? body.score_a : 0;
  const score_b = typeof body.score_b === 'number' ? body.score_b : 0;
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

  // 4. ตรวจสอบ Consistency กับ Best-of
  const winThreshold = Math.floor(match.best_of / 2) + 1;
  const winnerScore = winner_team_id === match.team_a_id ? score_a : score_b;
  if (outcome === 'NORMAL' && winnerScore < winThreshold) {
    return NextResponse.json(
      { error: 'RESULT_INCONSISTENT_WITH_GAMES: Winner must win majority of best_of games' },
      { status: 422 }
    );
  }

  const adminSupabase = await createAdminClient();
  const nowIso = new Date().toISOString();

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

  // 6. อัปเดต Bracket Node และส่งต่อผู้ชนะ/ผู้แพ้
  if (winner_team_id) {
    const { data: bracketNodeRaw } = await adminSupabase
      .from('bracket_nodes' as never)
      .select('id, winner_to_node_id, loser_to_node_id, bracket_type')
      .eq('match_id' as never, matchId)
      .maybeSingle();

    const bracketNode = bracketNodeRaw as unknown as BracketNodeRow | null;

    if (bracketNode) {
      const loserTeamId = winner_team_id === match.team_a_id ? match.team_b_id : match.team_a_id;

      await adminSupabase
        .from('bracket_nodes' as never)
        .update({
          winner_team_id,
          status: 'COMPLETED',
          updated_at: nowIso,
        } as never)
        .eq('id', bracketNode.id);

      if (bracketNode.winner_to_node_id) {
        const { data: nextWinnerRaw } = await adminSupabase
          .from('bracket_nodes' as never)
          .select('id, team_a_id, team_b_id')
          .eq('id', bracketNode.winner_to_node_id)
          .single();

        const nextWinnerNode = nextWinnerRaw as unknown as BracketNodeRow | null;
        if (nextWinnerNode) {
          const assignA = !nextWinnerNode.team_a_id;
          const newTeamA = assignA ? winner_team_id : nextWinnerNode.team_a_id;
          const newTeamB = !assignA ? winner_team_id : nextWinnerNode.team_b_id;

          await adminSupabase
            .from('bracket_nodes' as never)
            .update({
              team_a_id: newTeamA,
              team_b_id: newTeamB,
              status: Boolean(newTeamA && newTeamB) ? 'READY' : 'PENDING',
              updated_at: nowIso,
            } as never)
            .eq('id', nextWinnerNode.id);
        }
      }

      if (bracketNode.loser_to_node_id && loserTeamId) {
        const { data: nextLoserRaw } = await adminSupabase
          .from('bracket_nodes' as never)
          .select('id, team_a_id, team_b_id')
          .eq('id', bracketNode.loser_to_node_id)
          .single();

        const nextLoserNode = nextLoserRaw as unknown as BracketNodeRow | null;
        if (nextLoserNode) {
          const assignA = !nextLoserNode.team_a_id;
          const newTeamA = assignA ? loserTeamId : nextLoserNode.team_a_id;
          const newTeamB = !assignA ? loserTeamId : nextLoserNode.team_b_id;

          await adminSupabase
            .from('bracket_nodes' as never)
            .update({
              team_a_id: newTeamA,
              team_b_id: newTeamB,
              status: Boolean(newTeamA && newTeamB) ? 'READY' : 'PENDING',
              updated_at: nowIso,
            } as never)
            .eq('id', nextLoserNode.id);
        }
      }
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