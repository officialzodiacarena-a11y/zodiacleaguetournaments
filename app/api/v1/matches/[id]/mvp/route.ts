import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.id;
    const supabase = await createClient();

    const { data: latestGame, error: gameError } = await supabase
      .from('match_games')
      .select('id, game_number, map_name, status')
      .eq('match_id', matchId)
      .eq('status', 'COMPLETED')
      .order('game_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameError) {
      throw new Error(`Database fetch match_games failed: ${gameError.message}`);
    }

    const targetGame =
      latestGame ||
      (await supabase
        .from('match_games')
        .select('id, game_number, map_name, status')
        .eq('match_id', matchId)
        .order('game_number', { ascending: true })
        .limit(1)
        .maybeSingle()
        .then((res) => res.data));

    if (!targetGame) {
      return NextResponse.json({ match_id: matchId, mvp: null }, { status: 200 });
    }

    const { data: participant, error: partError } = await supabase
      .from('match_participants')
      .select(`
        id,
        kills,
        deaths,
        assists,
        acs,
        adr,
        headshot_pct,
        agent_played,
        team_id,
        player:player_id ( id, display_name ),
        team:team_id ( tag )
      `)
      .eq('match_game_id', targetGame.id)
      .order('acs', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (partError) {
      throw new Error(`Database fetch match_participants failed: ${partError.message}`);
    }

    if (!participant) {
      return NextResponse.json({ match_id: matchId, mvp: null }, { status: 200 });
    }

    const playerRecord = Array.isArray(participant.player) ? participant.player[0] : participant.player;
    const teamRecord = Array.isArray(participant.team) ? participant.team[0] : participant.team;

    return NextResponse.json(
      {
        match_id: matchId,
        mvp: {
          id: playerRecord?.id || participant.id,
          display_name: playerRecord?.display_name || 'VALORANT_ATHLETE',
          team_tag: teamRecord?.tag || 'ZDC',
          kills: participant.kills,
          deaths: participant.deaths,
          assists: participant.assists,
          acs: Number(participant.acs || 0),
          adr: Number(participant.adr || 0),
          headshot_pct: Number(participant.headshot_pct || 0),
          agent_played: participant.agent_played || 'Unknown',
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: errorMessage } },
      { status: 500 }
    );
  }
}
