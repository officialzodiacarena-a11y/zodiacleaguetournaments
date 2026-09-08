import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PlayerRow {
  id: string;
  athlete_id: string;
  display_name: string;
  avatar_url: string | null;
  country_code: string | null;
}

interface TeamMemberRow {
  player_id: string;
  teams: { tag: string; game_id: string } | null;
}

interface CareerStatsRow {
  player_id: string;
  avg_acs: number | null;
  avg_adr: number | null;
  avg_kd: number | null;
  win_rate: number | null;
  matches_played: number;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('game_id');
    const q = searchParams.get('q');
    const countryCode = searchParams.get('country_code');
    const hasTeamParam = searchParams.get('has_team');
    const limitParam = parseInt(searchParams.get('limit') ?? '20', 10);
    const pageParam = parseInt(searchParams.get('page') ?? '1', 10);

    if (!gameId) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAM', message: 'game_id เป็น parameter ที่จำเป็น' } },
        { status: 400 }
      );
    }

    const hasTeam: boolean | null =
      hasTeamParam === 'true' ? true : hasTeamParam === 'false' ? false : null;

    const limit = Math.min(Math.max(limitParam, 1), 100);
    const page = Math.max(pageParam, 1);
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Resolve active player_ids for this game (needed for has_team filter)
    let activePlayerIds: string[] = [];
    if (hasTeam !== null) {
      const { data: activeMembers } = await supabase
        .from('team_members')
        .select('player_id, teams!team_id(game_id)')
        .eq('status', 'ACTIVE');

      activePlayerIds = ((activeMembers ?? []) as unknown as TeamMemberRow[])
        .filter((tm) => tm.teams?.game_id === gameId)
        .map((tm) => tm.player_id);
    }

    // Build players query
    let playersQuery = supabase
      .from('players')
      .select('id, athlete_id, display_name, avatar_url, country_code', { count: 'exact' });

    if (q) {
      playersQuery = playersQuery.ilike('display_name', `%${q}%`);
    }
    if (countryCode) {
      playersQuery = playersQuery.eq('country_code', countryCode);
    }

    if (hasTeam === false && activePlayerIds.length > 0) {
      playersQuery = playersQuery.not('id', 'in', `(${activePlayerIds.join(',')})`);
    } else if (hasTeam === true && activePlayerIds.length > 0) {
      playersQuery = playersQuery.in('id', activePlayerIds);
    } else if (hasTeam === true && activePlayerIds.length === 0) {
      // has_team=true but no active players found → return empty
      return NextResponse.json({
        data: [],
        meta: { total: 0, page, limit },
      });
    }

    playersQuery = playersQuery.range(offset, offset + limit - 1);

    const { data: players, count, error: playersError } = await playersQuery;

    if (playersError) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: playersError.message } },
        { status: 500 }
      );
    }

    const playerRows = (players ?? []) as unknown as PlayerRow[];
    const playerIds = playerRows.map((p) => p.id);

    if (playerIds.length === 0) {
      return NextResponse.json({ data: [], meta: { total: count ?? 0, page, limit } });
    }

    // Get career stats and team tags in parallel
    const [statsRes, teamRes] = await Promise.all([
      supabase
        .from('player_stats')
        .select('player_id, avg_acs, avg_adr, avg_kd, win_rate, matches_played')
        .in('player_id', playerIds)
        .eq('game_id', gameId)
        .is('season_id', null),
      supabase
        .from('team_members')
        .select('player_id, teams!team_id(tag, game_id)')
        .in('player_id', playerIds)
        .eq('status', 'ACTIVE'),
    ]);

    const statsMap: Record<string, CareerStatsRow> = {};
    for (const s of (statsRes.data ?? []) as unknown as CareerStatsRow[]) {
      statsMap[s.player_id] = s;
    }

    const teamTagMap: Record<string, string | null> = {};
    for (const tm of (teamRes.data ?? []) as unknown as TeamMemberRow[]) {
      if (tm.teams?.game_id === gameId) {
        teamTagMap[tm.player_id] = tm.teams.tag;
      }
    }

    const data = playerRows.map((p) => {
      const stats = statsMap[p.id];
      return {
        player_id: p.id,
        athlete_id: p.athlete_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        country_code: p.country_code,
        team_tag: teamTagMap[p.id] ?? null,
        career_stats: stats
          ? {
              avg_acs: stats.avg_acs,
              avg_adr: stats.avg_adr,
              avg_kd: stats.avg_kd,
              win_rate: stats.win_rate,
              matches_played: stats.matches_played,
            }
          : null,
      };
    });

    return NextResponse.json({
      data,
      meta: { total: count ?? 0, page, limit },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
