import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_STATS = {
  matches_played: 0,
  games_played: 0,
  matches_won: 0,
  matches_lost: 0,
  total_kills: 0,
  total_deaths: 0,
  total_assists: 0,
  total_first_bloods: 0,
  avg_acs: null,
  avg_adr: null,
  avg_kd: null,
  avg_kda: null,
  headshot_pct: null,
  win_rate: null,
  agent_pool: {},
  map_performance: {},
  last_match_at: null,
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: playerId } = await params;
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('game_id');
    const seasonIdParam = searchParams.get('season_id');

    const supabase = await createClient();

    let query = supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', playerId);

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    // season_id not passed → career (IS NULL); otherwise filter by value
    if (seasonIdParam !== null) {
      query = query.eq('season_id', seasonIdParam);
    } else {
      query = query.is('season_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: error.message } },
        { status: 500 }
      );
    }

    // No row = player hasn't competed yet → return default zeros (NOT 404)
    if (!data) {
      return NextResponse.json({
        player_id: playerId,
        game_id: gameId ?? null,
        season_id: seasonIdParam ?? null,
        ...DEFAULT_STATS,
      });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
