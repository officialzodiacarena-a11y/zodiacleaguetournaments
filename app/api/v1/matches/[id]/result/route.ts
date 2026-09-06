import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  const body = await request.json();
  const {
    winner_team_id,
    outcome,
    score_a,
    score_b,
    rounds_won_a,
    rounds_won_b,
    result_source,
  } = body;

  // 3. ดึงข้อมูล Match และ Bracket Node
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select(`
      *,
      bracket_node:bracket_nodes(
        id, winner_to_node_id, loser_to_node_id, bracket_type
      )
    `)
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (match.status !== 'AWAITING_RESULT' && match.status !== 'LIVE') {
    return NextResponse.json(
      { error: 'MATCH_NOT_AWAITING_RESULT: Match is not awaiting result' },
      { status: 422 }
    );
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
  const { data: updatedMatch, error: updateErr } = await adminSupabase
    .from('matches')
    .update({
      winner_team_id,
      outcome: outcome || 'NORMAL',
      score_a: score_a ?? 0,
      score_b: score_b ?? 0,
      rounds_won_a: rounds_won_a ?? 0,
      rounds_won_b: rounds_won_b ?? 0,
      result_source: result_source || 'REFEREE',
      result_reported_by: player?.id || null,
      result_confirmed_at: nowIso,
      status: 'COMPLETED',
      ended_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', matchId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 6. อัปเดต Bracket Node และส่งต่อผู้ชนะ/ผู้แพ้
  if (match.bracket_node_id && match.bracket_node) {
    const loserTeamId = winner_team_id === match.team_a_id ? match.team_b_id : match.team_a_id;

    // อัปเดต Node ปัจจุบันเป็น COMPLETED
    await adminSupabase
      .from('bracket_nodes')
      .update({
        winner_team_id,
        status: 'COMPLETED',
        updated_at: nowIso,
      })
      .eq('id', match.bracket_node_id);

    // ส่งผู้ชนะไปยัง Node ถัดไป
    if (match.bracket_node.winner_to_node_id) {
      const { data: nextWinnerNode } = await adminSupabase
        .from('bracket_nodes')
        .select('id, team_a_id, team_b_id')
        .eq('id', match.bracket_node.winner_to_node_id)
        .single();

      if (nextWinnerNode) {
        const assignA = !nextWinnerNode.team_a_id;
        const newTeamA = assignA ? winner_team_id : nextWinnerNode.team_a_id;
        const newTeamB = !assignA ? winner_team_id : nextWinnerNode.team_b_id;
        const isReady = Boolean(newTeamA && newTeamB);

        await adminSupabase
          .from('bracket_nodes')
          .update({
            team_a_id: newTeamA,
            team_b_id: newTeamB,
            status: isReady ? 'READY' : 'PENDING',
            updated_at: nowIso,
          })
          .eq('id', nextWinnerNode.id);
      }
    }

    // ส่งผู้แพ้ไปยัง Lower Bracket Node (ถ้ามี)
    if (match.bracket_node.loser_to_node_id && loserTeamId) {
      const { data: nextLoserNode } = await adminSupabase
        .from('bracket_nodes')
        .select('id, team_a_id, team_b_id')
        .eq('id', match.bracket_node.loser_to_node_id)
        .single();

      if (nextLoserNode) {
        const assignA = !nextLoserNode.team_a_id;
        const newTeamA = assignA ? loserTeamId : nextLoserNode.team_a_id;
        const newTeamB = !assignA ? loserTeamId : nextLoserNode.team_b_id;
        const isReady = Boolean(newTeamA && newTeamB);

        await adminSupabase
          .from('bracket_nodes')
          .update({
            team_a_id: newTeamA,
            team_b_id: newTeamB,
            status: isReady ? 'READY' : 'PENDING',
            updated_at: nowIso,
          })
          .eq('id', nextLoserNode.id);
      }
    }
  }

  // 7. Audit Log
  await adminSupabase.from('match_state_transitions').insert({
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
  });

  return NextResponse.json(updatedMatch);
}
