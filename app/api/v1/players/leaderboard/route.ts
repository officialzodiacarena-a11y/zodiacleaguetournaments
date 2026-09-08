import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_METRICS = ['avg_acs', 'avg_adr', 'avg_kd', 'headshot_pct', 'win_rate'] as const;
type AllowedMetric = (typeof ALLOWED_METRICS)[number];

interface StatsRow {
  player_id: string;
  avg_acs: number | null;
  avg_adr: number | null;
  avg_kd: number | null;
  headshot_pct: number | null;
  win_rate: number | null;
  matches_played: number;
  players: {
    athlete_id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

interface TeamMemberRow {
  player_id: string;
  teams: { tag: string; game_id: string } | null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('game_id');
    const seasonIdParam = searchParams.get('season_id');
    const metricParam = searchParams.get('metric') ?? 'avg_acs';
    const limitParam = parseInt(searchParams.get('limit') ?? '20', 10);
    const pageParam = parseInt(searchParams.get('page') ?? '1', 10);

    if (!gameId) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAM', message: 'game_id เป็น parameter ที่จำเป็น' } },
        { status: 400 }
      );
    }

    if (!ALLOWED_METRICS.includes(metricParam as AllowedMetric)) {
      return NextResponse.json(
        {
          error: {
            code: 'UNSUPPORTED_METRIC',
            message: `metric "${metricParam}" ไม่รองรับ รองรับเฉพาะ: ${ALLOWED_METRICS.join(', ')}`,
          },
        },
        { status: 422 }
      );
    }

    const metric = metricParam as AllowedMetric;
    const limit = Math.min(Math.max(limitParam, 1), 100);
    const page = Math.max(pageParam, 1);
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Count query
    let countQuery = supabase
      .from('player_stats')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);
    if (seasonIdParam) {
      countQuery = countQuery.eq('season_id', seasonIdParam);
    } else {
      countQuery = countQuery.is('season_id', null);
    }
    const { count, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: countError.message } },
        { status: 500 }
      );
    }

    // Data query
    let dataQuery = supabase
      .from('player_stats')
      .select(`
        player_id,
        avg_acs,
        avg_adr,
        avg_kd,
        headshot_pct,
        win_rate,
        matches_played,
        players!player_id(
          athlete_id,
          display_name,
          avatar_url
        )
      `)
      .eq('game_id', gameId)
      .order(metric, { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (seasonIdParam) {
      dataQuery = dataQuery.eq('season_id', seasonIdParam);
    } else {
      dataQuery = dataQuery.is('season_id', null);
    }

    const { data: rows, error: dataError } = await dataQuery;

    if (dataError) {
      return NextResponse.json(
        { error: { code: 'QUERY_FAILED', message: dataError.message } },
        { status: 500 }
      );
    }

    const statsRows = (rows ?? []) as unknown as StatsRow[];
    const playerIds = statsRows.map((r) => r.player_id);

    // Get active team memberships for these players, filter by game_id
    const playerTeamTagMap: Record<string, string | null> = {};
    if (playerIds.length > 0) {
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('player_id, teams!team_id(tag, game_id)')
        .in('player_id', playerIds)
        .eq('status', 'ACTIVE');

      for (const tm of (teamMembers ?? []) as unknown as TeamMemberRow[]) {
        if (tm.teams?.game_id === gameId) {
          playerTeamTagMap[tm.player_id] = tm.teams.tag;
        }
      }
    }

    const data = statsRows.map((row, idx) => ({
      rank: offset + idx + 1,
      player_id: row.player_id,
      athlete_id: row.players?.athlete_id ?? null,
      display_name: row.players?.display_name ?? null,
      avatar_url: row.players?.avatar_url ?? null,
      team_tag: playerTeamTagMap[row.player_id] ?? null,
      avg_acs: row.avg_acs,
      avg_adr: row.avg_adr,
      avg_kd: row.avg_kd,
      headshot_pct: row.headshot_pct,
      win_rate: row.win_rate,
      matches_played: row.matches_played,
    }));

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
