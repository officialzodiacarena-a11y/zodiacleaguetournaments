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

  const body = await request.json();
  const { action, map_name } = body;

  if (!action || !map_name) {
    return NextResponse.json({ error: 'action and map_name are required' }, { status: 400 });
  }

  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select(`
      id, status, team_a_id, team_b_id,
      stage:tournament_stages(map_pool, veto_format)
    `)
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (match.status !== 'VETO') {
    return NextResponse.json({ error: 'MATCH_NOT_IN_VETO: Match is not in VETO status' }, { status: 422 });
  }

  const { data: completedSteps } = await supabase
    .from('map_vetoes')
    .select('*')
    .eq('match_id', matchId)
    .order('step_order', { ascending: true });

  const stepsDone = completedSteps || [];
  const currentStepOrder = stepsDone.length + 1;

  const alreadyUsed = stepsDone.some((s) => s.map_name.toLowerCase() === map_name.toLowerCase());
  if (alreadyUsed) {
    return NextResponse.json({ error: 'MAP_ALREADY_VETOED: Map has already been picked or banned' }, { status: 409 });
  }

  const stageData = Array.isArray(match.stage) ? match.stage[0] : match.stage;
  const mapPool: string[] = (stageData?.map_pool as string[]) || [];
  if (mapPool.length > 0 && !mapPool.some((m) => m.toLowerCase() === map_name.toLowerCase())) {
    return NextResponse.json({ error: 'INVALID_MAP: Map is not in stage map pool' }, { status: 422 });
  }

  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('player_id', player.id)
    .eq('status', 'ACTIVE')
    .in('team_id', [match.team_a_id, match.team_b_id])
    .in('role', ['CAPTAIN', 'MANAGER']);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ error: 'FORBIDDEN: Must be Captain or Manager' }, { status: 403 });
  }

  const userTeamId = memberships[0].team_id;
  const isEvenStep = currentStepOrder % 2 === 0;
  const expectedTeamId = isEvenStep ? match.team_b_id : match.team_a_id;

  if (userTeamId !== expectedTeamId) {
    return NextResponse.json({ error: 'NOT_YOUR_TURN: It is not your turn to veto' }, { status: 403 });
  }

  const adminSupabase = await createAdminClient();

  const { data: newVeto, error: insertErr } = await adminSupabase
    .from('map_vetoes')
    .insert({
      match_id: matchId,
      step_order: currentStepOrder,
      action,
      team_id: userTeamId,
      map_name,
      was_auto: false,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const remainingMaps = mapPool.filter((m) => !stepsDone.some((s) => s.map_name.toLowerCase() === m.toLowerCase()) && m.toLowerCase() !== map_name.toLowerCase());

  if (remainingMaps.length === 1) {
    await adminSupabase.from('map_vetoes').insert({
      match_id: matchId,
      step_order: currentStepOrder + 1,
      action: 'DECIDER',
      team_id: null,
      map_name: remainingMaps[0],
      was_auto: true,
    });

    const nowIso = new Date().toISOString();
    await adminSupabase
      .from('matches')
      .update({ status: 'LIVE', started_at: nowIso, updated_at: nowIso })
      .eq('id', matchId);

    await adminSupabase.from('match_state_transitions').insert({
      match_id: matchId,
      from_status: 'VETO',
      to_status: 'LIVE',
      trigger_source: 'SYSTEM',
      reason: 'Veto process completed with decider map determined',
    });
  }

  return NextResponse.json(newVeto, { status: 201 });
}
