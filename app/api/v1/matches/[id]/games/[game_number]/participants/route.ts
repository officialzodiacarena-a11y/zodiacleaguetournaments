import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asInsert } from '@/types/supabase-helpers';

interface ParticipantItem {
  player_id: string;
  team_id: string;
  game_account_id?: string;
  is_substitute?: boolean;
  agent_played?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  acs?: number;
  adr?: number;
  headshot_pct?: number;
  rounds_played?: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; game_number: string }> | { id: string; game_number: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;
  const gameNumber = parseInt(resolvedParams.game_number);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: game, error: gameErr } = await supabase
    .from('match_games')
    .select('id')
    .eq('match_id', matchId)
    .eq('game_number', gameNumber)
    .single();

  if (gameErr || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const body = await request.json();
  const participants: ParticipantItem[] = body.participants || [];

  if (!Array.isArray(participants) || participants.length === 0) {
    return NextResponse.json({ error: 'participants array is required' }, { status: 400 });
  }

  const payload = participants.map((p) => ({
    match_id: matchId,
    match_game_id: game.id,
    player_id: p.player_id,
    team_id: p.team_id,
    game_account_id: p.game_account_id || null,
    is_substitute: Boolean(p.is_substitute),
    agent_played: p.agent_played || null,
    kills: p.kills ?? 0,
    deaths: p.deaths ?? 0,
    assists: p.assists ?? 0,
    acs: p.acs ?? 0,
    adr: p.adr ?? 0,
    headshot_pct: p.headshot_pct ?? 0,
    rounds_played: p.rounds_played ?? 0,
  }));

  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase
    .from('match_participants')
    .upsert(asInsert<'match_participants'>(payload), { onConflict: 'match_game_id,player_id' })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: data.length, data }, { status: 201 });
}
