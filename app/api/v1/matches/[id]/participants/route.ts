import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface MatchGameRow {
  id: string;
  game_number: number;
  map_name: string | null;
  score_a: number;
  score_b: number;
  winner_team_id: string | null;
  match_participants: Array<{
    player_id: string;
    team_id: string;
    agent_played: string | null;
    kills: number;
    deaths: number;
    assists: number;
    acs: number | null;
    adr: number | null;
    first_bloods: number;
    headshot_pct: number | null;
    is_substitute: boolean;
    players: { display_name: string; athlete_id: string } | null;
  }>;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const { data: games, error } = await supabase
      .from('match_games')
      .select(`
        id,
        game_number,
        map_name,
        score_a,
        score_b,
        winner_team_id,
        match_participants (
          player_id,
          team_id,
          agent_played,
          kills,
          deaths,
          assists,
          acs,
          adr,
          first_bloods,
          headshot_pct,
          is_substitute,
          players!player_id (
            display_name,
            athlete_id
          )
        )
      `)
      .eq('match_id', matchId)
      .order('game_number', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: error.message } },
        { status: 500 }
      );
    }

    const gamesData = (games ?? []) as unknown as MatchGameRow[];

    const result = gamesData.map((g) => ({
      game_number: g.game_number,
      map_name: g.map_name,
      score_a: g.score_a,
      score_b: g.score_b,
      winner_team_id: g.winner_team_id,
      participants: g.match_participants.map((p) => ({
        player_id: p.player_id,
        display_name: p.players?.display_name ?? null,
        team_id: p.team_id,
        agent_played: p.agent_played,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        acs: p.acs,
        adr: p.adr,
        first_bloods: p.first_bloods,
        headshot_pct: p.headshot_pct,
        is_substitute: p.is_substitute,
      })),
    }));

    return NextResponse.json({ match_id: matchId, games: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
