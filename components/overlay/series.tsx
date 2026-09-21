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

// ---------- สถิติผู้เล่นรวมทั้งซีรีส์ (ใช้กับฉากสรุปผลเมื่อแมตช์จบ) ----------

// แถวสถิติผู้เล่นรายเกม ตรงกับผลลัพธ์ของ GET /api/v1/matches/[id]/participants
export interface OverlayParticipantStat {
  player_id: string;
  display_name: string | null;
  team_id: string;
  agent_played: string | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number | null;
  adr: number | null;
  first_bloods: number;
  headshot_pct: number | null;
}

export interface OverlayGameStats {
  game_number: number;
  map_name: string | null;
  participants: OverlayParticipantStat[];
}

export interface PlayerSeriesStat {
  playerId: string;
  name: string;
  teamId: string;
  games: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  avgAcs: number;
  avgAdr: number;
  avgHs: number;
  firstBloods: number;
  agents: string[];
  acsByGame: { gameNumber: number; mapName: string | null; acs: number }[];
}

// รวมสถิติของผู้เล่นแต่ละคนข้ามทุกเกม: K/D/A และ First Bloods = ผลรวม, ACS / ADR / HS% = ค่าเฉลี่ยรายเกม
export function aggregateSeriesStats(stats: OverlayGameStats[]): PlayerSeriesStat[] {
  const acc = new Map<string, PlayerSeriesStat & { acsSum: number; acsN: number; adrSum: number; adrN: number; hsSum: number; hsN: number }>();

  for (const game of stats) {
    for (const p of game.participants) {
      let row = acc.get(p.player_id);
      if (!row) {
        row = {
          playerId: p.player_id,
          name: p.display_name || "Unknown",
          teamId: p.team_id,
          games: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          kd: 0,
          avgAcs: 0,
          avgAdr: 0,
          avgHs: 0,
          firstBloods: 0,
          agents: [],
          acsByGame: [],
          acsSum: 0,
          acsN: 0,
          adrSum: 0,
          adrN: 0,
          hsSum: 0,
          hsN: 0,
        };
        acc.set(p.player_id, row);
      }
      row.games += 1;
      row.kills += p.kills ?? 0;
      row.deaths += p.deaths ?? 0;
      row.assists += p.assists ?? 0;
      row.firstBloods += p.first_bloods ?? 0;
      if (p.agent_played && !row.agents.includes(p.agent_played)) row.agents.push(p.agent_played);
      if (p.acs != null) {
        row.acsSum += Number(p.acs);
        row.acsN += 1;
        row.acsByGame.push({ gameNumber: game.game_number, mapName: game.map_name, acs: Number(p.acs) });
      }
      if (p.adr != null) {
        row.adrSum += Number(p.adr);
        row.adrN += 1;
      }
      if (p.headshot_pct != null) {
        row.hsSum += Number(p.headshot_pct);
        row.hsN += 1;
      }
    }
  }

  return Array.from(acc.values())
    .map((r) => ({
      playerId: r.playerId,
      name: r.name,
      teamId: r.teamId,
      games: r.games,
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists,
      kd: r.kills / Math.max(1, r.deaths),
      avgAcs: r.acsN ? r.acsSum / r.acsN : 0,
      avgAdr: r.adrN ? r.adrSum / r.adrN : 0,
      avgHs: r.hsN ? r.hsSum / r.hsN : 0,
      firstBloods: r.firstBloods,
      agents: r.agents,
      acsByGame: r.acsByGame,
    }))
    .sort((a, b) => b.avgAcs - a.avgAcs || b.kills - a.kills);
}

// MVP ของซีรีส์ = ผู้เล่นที่มี ACS เฉลี่ยสูงสุด (เท่ากันดูจำนวน Kill)
export function pickSeriesMvp(players: PlayerSeriesStat[]): PlayerSeriesStat | null {
  return players.length ? players[0] : null;
}

export interface TeamSeriesTotals {
  kills: number;
  deaths: number;
  assists: number;
  firstBloods: number;
  avgAcs: number;
  kd: number;
}

export function teamSeriesTotals(players: PlayerSeriesStat[], teamId: string): TeamSeriesTotals {
  const team = players.filter((p) => p.teamId === teamId);
  const kills = team.reduce((s, p) => s + p.kills, 0);
  const deaths = team.reduce((s, p) => s + p.deaths, 0);
  return {
    kills,
    deaths,
    assists: team.reduce((s, p) => s + p.assists, 0),
    firstBloods: team.reduce((s, p) => s + p.firstBloods, 0),
    avgAcs: team.length ? team.reduce((s, p) => s + p.avgAcs, 0) / team.length : 0,
    kd: kills / Math.max(1, deaths),
  };
}

// รอบที่ชนะรวมของแต่ละทีมจากทุกเกมที่จบแล้ว
export function totalRounds(games: OverlayGame[]) {
  let roundsA = 0;
  let roundsB = 0;
  for (const g of games) {
    if (!isGameDone(g)) continue;
    roundsA += g.score_a ?? 0;
    roundsB += g.score_b ?? 0;
  }
  return { roundsA, roundsB };
}

// ---------- ผู้นำแต่ละด้านของซีรีส์ (SERIES HIGHLIGHTS) ----------

export interface SeriesHighlight {
  key: string;
  label: string;
  playerName: string;
  teamId: string;
  value: string;
  detail?: string;
}

// ผู้เล่นเด่นแต่ละด้านจากผลรวมทุกเกม: Kill รวม, K/D, Headshot %, ADR, First Bloods, Assists และ ACS สูงสุดในแมพเดียว
// ข้ามด้านที่ค่าเป็น 0 (ไม่มีข้อมูล) เพื่อไม่ให้แสดงตัวเลขที่ไม่มีความหมาย
export function seriesHighlights(players: PlayerSeriesStat[], stats: OverlayGameStats[]): SeriesHighlight[] {
  const out: SeriesHighlight[] = [];

  const leader = (
    key: string,
    label: string,
    pick: (p: PlayerSeriesStat) => number,
    format: (n: number) => string,
    detail?: (p: PlayerSeriesStat) => string
  ) => {
    let best: PlayerSeriesStat | null = null;
    for (const p of players) {
      if (!best || pick(p) > pick(best)) best = p;
    }
    if (best && pick(best) > 0) {
      out.push({ key, label, playerName: best.name, teamId: best.teamId, value: format(pick(best)), detail: detail?.(best) });
    }
  };

  leader("kills", "Most Kills", (p) => p.kills, (n) => String(n), (p) => `${p.games} MAPS`);
  leader("kd", "Best K/D", (p) => p.kd, (n) => n.toFixed(2), (p) => `${p.kills}/${p.deaths}`);
  leader("hs", "Best Headshot %", (p) => p.avgHs, (n) => `${Math.round(n)}%`);
  leader("adr", "Highest ADR", (p) => p.avgAdr, (n) => String(Math.round(n)));
  leader("fb", "Most First Bloods", (p) => p.firstBloods, (n) => String(n));
  leader("assists", "Most Assists", (p) => p.assists, (n) => String(n));

  let bestAcs: { name: string; teamId: string; acs: number; map: string | null } | null = null;
  for (const g of stats) {
    for (const p of g.participants) {
      const acs = p.acs != null ? Number(p.acs) : 0;
      if (acs > 0 && (!bestAcs || acs > bestAcs.acs)) {
        bestAcs = { name: p.display_name || "Unknown", teamId: p.team_id, acs, map: g.map_name };
      }
    }
  }
  if (bestAcs) {
    out.push({
      key: "acs",
      label: "Best Single-Map ACS",
      playerName: bestAcs.name,
      teamId: bestAcs.teamId,
      value: String(Math.round(bestAcs.acs)),
      detail: bestAcs.map ? bestAcs.map.toUpperCase() : undefined,
    });
  }

  return out;
}
