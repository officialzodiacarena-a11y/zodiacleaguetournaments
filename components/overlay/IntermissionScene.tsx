// components/overlay/IntermissionScene.tsx
// OBS broadcast overlay: Match Intermission (ฉาก AWAITING_RESULT ของ /overlay/match/[id])
// แสดงหลังจบแต่ละแมพของซีรีส์: สกอร์ซีรีส์, ผลทุกเกม, แมพถัดไป, MVP + Sponsor Tower ซ้าย/ขวา
"use client";

import React from "react";
import { SkyscraperTower } from "@/components/sponsor/SkyscraperTower";
import {
  DetailCell,
  TEAM_A_TEXT,
  TEAM_B_TEXT,
  buildSeriesGames,
  countSeriesWins,
  isGameDone,
  type OverlayGame,
  type OverlayTeam,
  type OverlayVeto,
} from "@/components/overlay/series";

export interface IntermissionMvp {
  display_name: string;
  team_tag: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  headshot_pct: number;
  agent_played: string;
}

export interface IntermissionSceneProps {
  teamA: OverlayTeam;
  teamB: OverlayTeam;
  bestOf: number;
  matchCode: string;
  tournamentName: string | null;
  stageName: string | null;
  roundLabel: string | null;
  vetoes: OverlayVeto[];
  games: OverlayGame[];
  mvp: IntermissionMvp | null;
}

export function IntermissionScene({
  teamA,
  teamB,
  bestOf,
  matchCode,
  tournamentName,
  stageName,
  roundLabel,
  vetoes,
  games,
  mvp,
}: IntermissionSceneProps) {
  const { totalGames, seriesGames, nextGameNumber } = buildSeriesGames(bestOf, vetoes, games);
  const { winsA, winsB } = countSeriesWins(teamA, teamB, games);
  const winsNeeded = Math.floor(totalGames / 2) + 1;
  const seriesOver = winsA >= winsNeeded || winsB >= winsNeeded;
  const seriesWinner = winsA >= winsNeeded ? teamA : winsB >= winsNeeded ? teamB : null;
  const completedCount = games.filter((g) => isGameDone(g)).length;
  const nextGame = seriesGames.find((g) => g.gameNumber === nextGameNumber);
  const stageLine = [stageName, roundLabel].filter(Boolean).join(" • ") || "—";

  const teamTextClass = (teamId: string | null | undefined) =>
    teamId === teamA.id ? TEAM_A_TEXT : teamId === teamB.id ? TEAM_B_TEXT : "text-gray-500";
  const teamTag = (teamId: string | null | undefined) =>
    teamId === teamA.id ? teamA.tag : teamId === teamB.id ? teamB.tag : "";

  return (
    <section className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-30 p-20">
      {/* SPONSOR TOWERS (ซ้าย: Title Sponsor / ขวา: Season cards) */}
      <SkyscraperTower position="LEFT_TOWER" />
      <SkyscraperTower position="RIGHT_TOWER" />

      <div className="flex gap-8 w-[1360px] items-stretch">
        <div className={`${mvp ? "flex-1 min-w-0" : "w-[1200px] mx-auto"} bg-[#12121A]/80 border border-gray-800 rounded-2xl p-8 relative shadow-2xl`}>
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent" />

          {/* HEADER + SERIES SCORE */}
          <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-6">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] tracking-wider uppercase font-bold">
                {seriesOver
                  ? "SERIES COMPLETE"
                  : completedCount > 0
                    ? `MAP ${completedCount} COMPLETE`
                    : "MAP SERIES RESULTS"}
              </span>
              <h2 className="text-3xl font-black text-white font-mono tracking-widest uppercase mt-2">Match Intermission</h2>
            </div>
            <div className="flex items-center gap-5 font-mono">
              <div className="text-right">
                <p className={`text-sm font-black tracking-widest ${TEAM_A_TEXT}`}>{teamA.tag}</p>
                <p className="text-[9px] text-neutral-500 truncate max-w-[140px]">{teamA.name}</p>
              </div>
              <div className="flex items-center gap-3 px-5 py-2 rounded-xl border border-white/10 bg-[#0D0E1A]/70">
                <span className={`text-4xl font-black ${winsA >= winsB ? TEAM_A_TEXT : "text-neutral-500"}`}>{winsA}</span>
                <span className="text-neutral-600 text-xl">–</span>
                <span className={`text-4xl font-black ${winsB >= winsA ? TEAM_B_TEXT : "text-neutral-500"}`}>{winsB}</span>
              </div>
              <div className="text-left">
                <p className={`text-sm font-black tracking-widest ${TEAM_B_TEXT}`}>{teamB.tag}</p>
                <p className="text-[9px] text-neutral-500 truncate max-w-[140px]">{teamB.name}</p>
              </div>
            </div>
          </div>

          {/* MATCH DETAILS */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <DetailCell label="Tournament" value={tournamentName || "—"} />
            <DetailCell label="Stage / Round" value={stageLine} />
            <DetailCell label="Match" value={`#${matchCode}`} valueClass="text-[#C9A84C] tracking-wider" />
            <DetailCell label="Format" value={`BO${totalGames} • FIRST TO ${winsNeeded}`} />
          </div>

          {/* ALL GAMES OF THE SERIES */}
          <div className="space-y-3">
            {seriesGames.map(({ gameNumber, game, veto, mapName }) => {
              const done = isGameDone(game);
              const isLive = (game?.status || "").toUpperCase() === "LIVE";
              const isNext = gameNumber === nextGameNumber && !isLive;
              const hasMap = Boolean(mapName);
              const winnerId =
                game?.winner_team_id ||
                (done && game ? (game.score_a > game.score_b ? teamA.id : game.score_b > game.score_a ? teamB.id : null) : null);
              const statusLabel = isLive ? "LIVE" : done ? "COMPLETED" : isNext ? "NEXT MAP" : hasMap ? "UPCOMING" : "PENDING";
              const statusClass = isLive
                ? "text-red-400 border-red-500/50 bg-red-500/10 animate-pulse"
                : done
                  ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                  : isNext
                    ? "text-[#C9A84C] border-[#C9A84C]/50 bg-[#C9A84C]/10"
                    : "text-neutral-500 border-white/10";
              const pickedBy = veto ? (veto.action === "DECIDER" ? "DECIDER" : teamTag(veto.team_id)) : "";

              return (
                <div
                  key={gameNumber}
                  className={`flex items-center justify-between rounded-xl border px-6 py-4 ${
                    isNext
                      ? "border-[#C9A84C]/50 bg-[#C9A84C]/5 shadow-[0_0_15px_rgba(201,168,76,0.12)]"
                      : hasMap
                        ? "border-white/10 bg-[#0D0E1A]/60"
                        : "border-white/5 opacity-40"
                  }`}
                >
                  <div className="min-w-0 w-[280px]">
                    <p className="font-mono text-[10px] font-black tracking-[0.16em] text-gray-400">
                      MAP {gameNumber}
                      {pickedBy && <span className="ml-2 text-gray-600 tracking-widest">• {pickedBy}</span>}
                    </p>
                    <p className="font-mono text-xl font-black text-white truncate mt-1">{mapName || "TBD"}</p>
                  </div>

                  <div className="flex items-center gap-5 font-mono">
                    {done && game ? (
                      <>
                        <span className={`text-3xl font-black ${game.score_a > game.score_b ? TEAM_A_TEXT : "text-neutral-600"}`}>{game.score_a}</span>
                        <span className="text-xs text-neutral-600">VS</span>
                        <span className={`text-3xl font-black ${game.score_b > game.score_a ? TEAM_B_TEXT : "text-neutral-600"}`}>{game.score_b}</span>
                      </>
                    ) : (
                      <span className="text-2xl font-black text-neutral-700">– : –</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 w-[280px]">
                    {done && winnerId && (
                      <span className={`text-[10px] font-mono font-black tracking-widest ${teamTextClass(winnerId)}`}>
                        WIN {teamTag(winnerId)}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-black tracking-[0.14em] ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* NEXT UP / SERIES WINNER */}
          <div className="mt-6 rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-6 py-3 text-center font-mono">
            {seriesOver && seriesWinner ? (
              <span className="text-sm font-black tracking-[0.2em] text-[#C9A84C]">
                SERIES WINNER • <span className={seriesWinner.id === teamA.id ? TEAM_A_TEXT : TEAM_B_TEXT}>{seriesWinner.name.toUpperCase()}</span>
              </span>
            ) : nextGame ? (
              <span className="text-sm font-black tracking-[0.2em] text-[#C9A84C]">
                NEXT UP • MAP {nextGame.gameNumber} • {nextGame.mapName?.toUpperCase()}
              </span>
            ) : (
              <span className="text-sm font-black tracking-[0.2em] text-neutral-500">AWAITING RESULT CONFIRMATION</span>
            )}
          </div>
        </div>

        {/* MVP FOR CURRENT MAP */}
        {mvp && (
          <div className="w-[400px] bg-gradient-to-b from-[#12121A]/95 to-[#0A0A0F] border-2 border-[#C9A84C]/50 rounded-2xl p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF] tracking-wider uppercase font-bold">
                  MVP FOR CURRENT MAP
                </span>
                <span className="font-mono text-sm text-[#C9A84C] font-black">{mvp.team_tag}</span>
              </div>

              <div className="text-center my-6">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b1c2b] to-[#252740] border border-[#C9A84C]/30 text-white font-mono text-2xl font-black mb-3">
                  {mvp.display_name.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="font-mono text-2xl font-black text-white uppercase tracking-wider break-words">{mvp.display_name}</h3>
                <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-1">AGENT: {mvp.agent_played}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 my-6">
                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                  <p className="font-mono text-[9px] text-gray-500 uppercase">K / D / A</p>
                  <p className="font-mono text-sm font-black text-white mt-1">{mvp.kills}/{mvp.deaths}/{mvp.assists}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                  <p className="font-mono text-[9px] text-gray-500 uppercase">AVG ACS</p>
                  <p className="font-mono text-sm font-black text-[#00D4FF] mt-1">{mvp.acs}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                  <p className="font-mono text-[9px] text-gray-500 uppercase">HS RATE</p>
                  <p className="font-mono text-sm font-black text-[#C9A84C] mt-1">{mvp.headshot_pct}%</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 text-center">
              <span className="font-mono text-[9px] text-neutral-500 uppercase">ZODIAC ARENA PERFORMANCE ENGINE</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
