// components/overlay/series.tsx
// ชิ้นส่วนที่ฉาก Overlay (Veto / Intermission) ใช้ร่วมกัน: ชนิดข้อมูล, ช่องรายละเอียดแมตช์, การหาแมพของแต่ละเกมในซีรีส์
import React from "react";

export type OverlayVetoAction = "BAN" | "PICK" | "DECIDER" | "SIDE_PICK";

export interface OverlayTeam {
  id: string;
  name: string;
  tag: string;
}

export interface OverlayVeto {
  step_order: number;
  action: OverlayVetoAction;
  team_id: string | null;
  map_name: string;
  was_auto: boolean;
}

export interface OverlayGame {
  game_number: number;
  map_name: string | null;
  score_a: number;
  score_b: number;
  status: string;
  winner_team_id?: string | null;
}

export const TEAM_A_TEXT = "text-[#00D4FF]";
export const TEAM_B_TEXT = "text-[#FF4655]";

export function DetailCell({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0D0E1A]/60 px-4 py-3 min-w-0">
      <p className="text-[9px] font-mono tracking-[0.16em] text-neutral-500 uppercase">{label}</p>
      <p className={`mt-1 text-sm font-black font-mono truncate ${valueClass}`}>{value}</p>
    </div>
  );
}

export function isGameDone(game: OverlayGame | undefined): boolean {
  const status = (game?.status || "").toUpperCase();
  return status === "COMPLETED" || status === "FINISHED";
}

export interface SeriesGame {
  gameNumber: number;
  game: OverlayGame | undefined;
  veto: OverlayVeto | undefined;
  mapName: string | null;
  gameStatus: string;
}

// แมพที่ถูก PICK / DECIDER ตามลำดับสเต็ป = ลำดับแมพที่จะแข่ง (Game 1, 2, 3, ...)
// ข้อมูลจากตาราง match_games มาก่อน ถ้ายังไม่มีใช้แมพจาก Veto
export function buildSeriesGames(bestOf: number, vetoes: OverlayVeto[], games: OverlayGame[]) {
  const totalGames = Math.max(1, bestOf);
  const playedMaps = [...vetoes]
    .filter((v) => v.action === "PICK" || v.action === "DECIDER")
    .sort((a, b) => a.step_order - b.step_order);

  const seriesGames: SeriesGame[] = Array.from({ length: totalGames }, (_, i) => {
    const gameNumber = i + 1;
    const game = games.find((g) => g.game_number === gameNumber);
    const veto = playedMaps[i];
    return {
      gameNumber,
      game,
      veto,
      mapName: game?.map_name || veto?.map_name || null,
      gameStatus: (game?.status || "").toUpperCase(),
    };
  });

  const nextGameNumber = seriesGames.find((g) => g.mapName && !isGameDone(g.game))?.gameNumber;
  return { totalGames, seriesGames, nextGameNumber };
}

// จำนวนแมพที่แต่ละทีมชนะ: ใช้ winner_team_id ก่อน ถ้าไม่มีเทียบสกอร์ของเกมที่จบแล้ว
export function countSeriesWins(teamA: OverlayTeam, teamB: OverlayTeam, games: OverlayGame[]) {
  let winsA = 0;
  let winsB = 0;
  for (const g of games) {
    if (!isGameDone(g)) continue;
    if (g.winner_team_id === teamA.id) winsA += 1;
    else if (g.winner_team_id === teamB.id) winsB += 1;
    else if (g.score_a > g.score_b) winsA += 1;
    else if (g.score_b > g.score_a) winsB += 1;
  }
  return { winsA, winsB };
}
