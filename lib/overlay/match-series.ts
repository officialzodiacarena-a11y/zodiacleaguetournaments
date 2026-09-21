// lib/overlay/match-series.ts
// สถานะซีรีส์ฝั่งเซิร์ฟเวอร์ (เกมที่จบแล้ว, เกมปัจจุบัน, แมพ, สกอร์ซีรีส์) ใช้กติกาเดียวกับฉาก Overlay
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  buildSeriesGames,
  countSeriesWins,
  isGameDone,
  type OverlayGame,
  type OverlayTeam,
  type OverlayVeto,
} from '@/components/overlay/series';

// ฟิลด์ของแถว matches ที่ตรรกะซีรีส์ใช้ (แถวจาก DB ตรงกับชนิดนี้)
export interface SeriesMatchRow {
  id: string;
  status: string;
  best_of: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  rounds_won_a: number | null;
  rounds_won_b: number | null;
  format_config: unknown;
}

// ตรรกะล้วน (ไม่ใช้ DB) — ทดสอบได้ใน tests/series-flow.test.ts
export function computeSeriesState<M extends SeriesMatchRow>(match: M, vetoes: OverlayVeto[], games: OverlayGame[]) {
  const { totalGames, seriesGames, nextGameNumber } = buildSeriesGames(match.best_of ?? 1, vetoes, games);
  const completedCount = games.filter((g) => isGameDone(g)).length;

  const teamA: OverlayTeam = { id: match.team_a_id ?? '', name: '', tag: '' };
  const teamB: OverlayTeam = { id: match.team_b_id ?? '', name: '', tag: '' };
  const { winsA, winsB } = countSeriesWins(teamA, teamB, games);
  const winsNeeded = Math.floor(totalGames / 2) + 1;
  const seriesOver = winsA >= winsNeeded || winsB >= winsNeeded || completedCount >= totalGames;

  const current = seriesOver ? undefined : seriesGames.find((g) => g.gameNumber === (nextGameNumber ?? completedCount + 1));

  return {
    match,
    vetoes,
    games,
    totalGames,
    completedCount,
    winsA,
    winsB,
    winsNeeded,
    seriesOver,
    currentGameNumber: current?.gameNumber ?? (seriesOver ? null : completedCount + 1),
    currentMapName: current?.mapName ?? null,
  };
}

export type SeriesState = ReturnType<typeof computeSeriesState<SeriesMatchRow>>;

export async function loadSeriesState(db: SupabaseClient<Database>, matchId: string) {
  const { data: match, error } = await db
    .from('matches')
    .select('id, status, best_of, team_a_id, team_b_id, rounds_won_a, rounds_won_b, format_config')
    .eq('id', matchId)
    .maybeSingle();

  if (error || !match) return null;

  const [{ data: vetoRows }, { data: gameRows }] = await Promise.all([
    db.from('map_vetoes').select('step_order, action, team_id, map_name, was_auto').eq('match_id', matchId).order('step_order', { ascending: true }),
    db
      .from('match_games')
      .select('game_number, map_name, score_a, score_b, status, winner_team_id')
      .eq('match_id', matchId)
      .order('game_number', { ascending: true }),
  ]);

  return computeSeriesState(match, (vetoRows ?? []) as OverlayVeto[], (gameRows ?? []) as OverlayGame[]);
}
