import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface MatchInfo {
  seasonId: string | null;
  endedAt: string | null;
  winnerTeamId: string | null;
}

interface ParticipantRow {
  player_id: string;
  team_id: string;
  match_id: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number | null;
  adr: number | null;
  first_bloods: number;
  headshot_pct: number | null;
  agent_played: string | null;
  teams: { game_id: string } | null;
  match_games: { map_name: string | null; winner_team_id: string | null } | null;
}

interface PlayerStatsAccum {
  player_id: string;
  game_id: string;
  season_id: string | null;
  matchIds: Set<string>;
  matchesWon: number;
  matchesLost: number;
  gamesPlayed: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalFirstBloods: number;
  acsValues: number[];
  adrValues: number[];
  hsValues: number[];
  agentPool: Record<string, number>;
  mapPerformance: Record<string, { played: number; won: number }>;
  lastMatchAt: string | null;
}

const avg = (arr: number[]): number | null =>
  arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

const round2 = (n: number | null): number | null =>
  n !== null ? Math.round(n * 100) / 100 : null;

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid CRON_SECRET' } },
      { status: 401 }
    );
  }

  try {
    const adminSupabase = createAdminClient();

    // Step 1: Get all COMPLETED matches with season_id via tournaments
    const { data: completedMatches, error: matchError } = await adminSupabase
      .from('matches')
      .select('id, ended_at, winner_team_id, tournaments!tournament_id(season_id)')
      .eq('status', 'COMPLETED');

    if (matchError) {
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    if (!completedMatches || completedMatches.length === 0) {
      return NextResponse.json({ success: true, players_updated: 0, season_rows: 0, career_rows: 0 });
    }

    const matchInfoMap: Record<string, MatchInfo> = {};
    for (const m of completedMatches) {
      const raw = m as unknown as {
        id: string;
        ended_at: string | null;
        winner_team_id: string | null;
        tournaments: { season_id: string } | null;
      };
      matchInfoMap[raw.id] = {
        seasonId: raw.tournaments?.season_id ?? null,
        endedAt: raw.ended_at,
        winnerTeamId: raw.winner_team_id,
      };
    }

    const completedMatchIds = Object.keys(matchInfoMap);

    // Step 2: Fetch all match_participants in chunks
    const CHUNK_SIZE = 500;
    const allParticipants: ParticipantRow[] = [];

    for (let i = 0; i < completedMatchIds.length; i += CHUNK_SIZE) {
      const chunk = completedMatchIds.slice(i, i + CHUNK_SIZE);
      const { data: parts, error: partsError } = await adminSupabase
        .from('match_participants')
        .select(`
          player_id,
          team_id,
          match_id,
          kills,
          deaths,
          assists,
          acs,
          adr,
          first_bloods,
          headshot_pct,
          agent_played,
          teams!team_id(game_id),
          match_games!match_game_id(map_name, winner_team_id)
        `)
        .in('match_id', chunk);

      if (partsError) {
        return NextResponse.json({ error: partsError.message }, { status: 500 });
      }
      allParticipants.push(...((parts ?? []) as unknown as ParticipantRow[]));
    }

    // Step 3: Aggregate stats per (player_id, game_id, season_id)
    const statsMap = new Map<string, PlayerStatsAccum>();

    const getOrCreate = (playerId: string, gameId: string, seasonId: string | null): PlayerStatsAccum => {
      const key = `${playerId}:${gameId}:${seasonId ?? '__career__'}`;
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          player_id: playerId,
          game_id: gameId,
          season_id: seasonId,
          matchIds: new Set(),
          matchesWon: 0,
          matchesLost: 0,
          gamesPlayed: 0,
          totalKills: 0,
          totalDeaths: 0,
          totalAssists: 0,
          totalFirstBloods: 0,
          acsValues: [],
          adrValues: [],
          hsValues: [],
          agentPool: {},
          mapPerformance: {},
          lastMatchAt: null,
        });
      }
      return statsMap.get(key)!;
    };

    for (const p of allParticipants) {
      const gameId = p.teams?.game_id;
      if (!gameId) continue;

      const matchInfo = matchInfoMap[p.match_id];
      if (!matchInfo) continue;

      // Process once for season row (if applicable) and once for career row
      const seasonIds = [...new Set<string | null>([matchInfo.seasonId, null])];

      for (const sid of seasonIds) {
        const stats = getOrCreate(p.player_id, gameId, sid);

        // Match-level stats counted once per match
        if (!stats.matchIds.has(p.match_id)) {
          stats.matchIds.add(p.match_id);
          if (matchInfo.winnerTeamId === p.team_id) {
            stats.matchesWon++;
          } else {
            stats.matchesLost++;
          }
          if (matchInfo.endedAt && (!stats.lastMatchAt || matchInfo.endedAt > stats.lastMatchAt)) {
            stats.lastMatchAt = matchInfo.endedAt;
          }
        }

        // Game-level stats
        stats.gamesPlayed++;
        stats.totalKills += p.kills;
        stats.totalDeaths += p.deaths;
        stats.totalAssists += p.assists;
        stats.totalFirstBloods += p.first_bloods;
        if (p.acs !== null) stats.acsValues.push(p.acs);
        if (p.adr !== null) stats.adrValues.push(p.adr);
        if (p.headshot_pct !== null) stats.hsValues.push(p.headshot_pct);

        if (p.agent_played) {
          stats.agentPool[p.agent_played] = (stats.agentPool[p.agent_played] ?? 0) + 1;
        }

        const mapName = p.match_games?.map_name ?? 'Unknown';
        if (!stats.mapPerformance[mapName]) {
          stats.mapPerformance[mapName] = { played: 0, won: 0 };
        }
        stats.mapPerformance[mapName].played++;
        if (p.match_games?.winner_team_id === p.team_id) {
          stats.mapPerformance[mapName].won++;
        }
      }
    }

    // Step 4: Build DB rows
    const seasonRows: Record<string, unknown>[] = [];
    const careerRows: Record<string, unknown>[] = [];
    const now = new Date().toISOString();

    for (const stats of statsMap.values()) {
      const matchesPlayed = stats.matchIds.size;
      const row: Record<string, unknown> = {
        player_id: stats.player_id,
        game_id: stats.game_id,
        season_id: stats.season_id,
        matches_played: matchesPlayed,
        games_played: stats.gamesPlayed,
        matches_won: stats.matchesWon,
        matches_lost: stats.matchesLost,
        total_kills: stats.totalKills,
        total_deaths: stats.totalDeaths,
        total_assists: stats.totalAssists,
        total_first_bloods: stats.totalFirstBloods,
        avg_acs: round2(avg(stats.acsValues)),
        avg_adr: round2(avg(stats.adrValues)),
        avg_kd: stats.totalDeaths > 0 ? round2(stats.totalKills / stats.totalDeaths) : null,
        avg_kda: stats.totalDeaths > 0 ? round2((stats.totalKills + stats.totalAssists) / stats.totalDeaths) : null,
        headshot_pct: stats.hsValues.length > 0 ? round2(avg(stats.hsValues)) : null,
        win_rate: matchesPlayed > 0 ? round2((stats.matchesWon / matchesPlayed) * 100) : null,
        agent_pool: stats.agentPool,
        map_performance: stats.mapPerformance,
        last_match_at: stats.lastMatchAt,
        updated_at: now,
      };

      if (stats.season_id !== null) {
        seasonRows.push(row);
      } else {
        careerRows.push(row);
      }
    }

    // Step 5: Upsert season rows (partial index covers season_id NOT NULL)
    if (seasonRows.length > 0) {
      const { error: seasonUpsertError } = await adminSupabase
        .from('player_stats')
        .upsert(seasonRows, { onConflict: 'player_id,game_id,season_id' });
      if (seasonUpsertError) {
        return NextResponse.json({ error: seasonUpsertError.message }, { status: 500 });
      }
    }

    // Step 6: Career rows — delete then insert (partial index WHERE season_id IS NULL can't upsert)
    if (careerRows.length > 0) {
      const { error: deleteError } = await adminSupabase
        .from('player_stats')
        .delete()
        .is('season_id', null);
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      const { error: careerInsertError } = await adminSupabase
        .from('player_stats')
        .insert(careerRows);
      if (careerInsertError) {
        return NextResponse.json({ error: careerInsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      players_updated: statsMap.size,
      season_rows: seasonRows.length,
      career_rows: careerRows.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
