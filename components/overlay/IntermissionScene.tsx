// components/overlay/IntermissionScene.tsx
// OBS broadcast overlay: Match Intermission (ฉาก AWAITING_RESULT) และ Match Complete (สถานะ COMPLETED)
// หลังจบแต่ละแมพ: สกอร์ซีรีส์, ผลทุกเกม, แมพถัดไป, MVP
// เมื่อแมตช์จบ (isFinal): เพิ่มสรุปรวมทั้งซีรีส์ (BO3/BO5) — ผลรวมทีม, ตารางสถิติผู้เล่น, Series MVP
"use client";

import React from "react";
import { SkyscraperTower } from "@/components/sponsor/SkyscraperTower";
import {
  DetailCell,
  TEAM_A_TEXT,
  TEAM_B_TEXT,
  aggregateSeriesStats,
  buildSeriesGames,
  countSeriesWins,
  isGameDone,
  pickSeriesMvp,
  seriesHighlights,
  teamSeriesTotals,
  totalRounds,
  type OverlayGame,
  type OverlayGameStats,
  type OverlayTeam,
  type OverlayVeto,
  type PlayerSeriesStat,
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
  // แมตช์จบแล้ว (matches.status = COMPLETED): แสดงเป็นฉากสรุปผลซีรีส์
  isFinal?: boolean;
  winnerTeamId?: string | null;
  // สกอร์ซีรีส์จากตาราง matches ใช้เมื่อไม่มีผลรายเกมใน match_games
  fallbackScoreA?: number;
  fallbackScoreB?: number;
  // สถิติผู้เล่นรายเกม (จาก /participants) ใช้รวมเป็นสถิติทั้งซีรีส์
  stats?: OverlayGameStats[];
}

const f0 = (n: number) => (Number.isFinite(n) ? Math.round(n).toString() : "0");
const f2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

function CompareCell({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0D0E1A]/60 px-3 py-2.5 text-center min-w-0">
      <p className="text-[9px] font-mono tracking-[0.16em] text-neutral-500 uppercase">{label}</p>
      <p className="mt-1 text-base font-black font-mono">
        <span className={TEAM_A_TEXT}>{a}</span>
        <span className="text-neutral-600 mx-1.5">–</span>
        <span className={TEAM_B_TEXT}>{b}</span>
      </p>
    </div>
  );
}

function TeamStatsTable({ team, accent, players }: { team: OverlayTeam; accent: string; players: PlayerSeriesStat[] }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0D0E1A]/60 p-3 min-w-0">
      <p className={`text-[10px] font-mono font-black tracking-[0.18em] mb-2 ${accent}`}>{team.tag} • PLAYER STATS</p>
      <div className="grid grid-cols-[1fr_70px_40px_40px_40px] gap-x-2 text-[9px] font-mono text-neutral-500 uppercase pb-1 border-b border-white/5">
        <span>Player</span>
        <span className="text-center">K/D/A</span>
        <span className="text-right">ACS</span>
        <span className="text-right">ADR</span>
        <span className="text-right">HS%</span>
      </div>
      <div className="mt-1 space-y-0.5">
        {players.map((p) => (
          <div key={p.playerId} className="grid grid-cols-[1fr_70px_40px_40px_40px] gap-x-2 items-center py-1 text-[11px] font-mono">
            <div className="min-w-0">
              <p className="font-black text-white truncate leading-tight">{p.name}</p>
              <p className="text-[8px] text-neutral-500 truncate leading-tight uppercase">{p.agents.join(", ") || "—"}</p>
            </div>
            <span className="text-center text-gray-300">{p.kills}/{p.deaths}/{p.assists}</span>
            <span className={`text-right font-black ${accent}`}>{f0(p.avgAcs)}</span>
            <span className="text-right text-gray-300">{f0(p.avgAdr)}</span>
            <span className="text-right text-gray-300">{f0(p.avgHs)}</span>
          </div>
        ))}
        {players.length === 0 && <p className="py-3 text-center text-[10px] font-mono text-neutral-600">NO PLAYER STATS</p>}
      </div>
    </div>
  );
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
  isFinal = false,
  winnerTeamId = null,
  fallbackScoreA = 0,
  fallbackScoreB = 0,
  stats = [],
}: IntermissionSceneProps) {
  const { totalGames, seriesGames, nextGameNumber } = buildSeriesGames(bestOf, vetoes, games);
  const completedCount = games.filter((g) => isGameDone(g)).length;
  const counted = countSeriesWins(teamA, teamB, games);
  // ไม่มีผลรายเกมใน match_games แต่แมตช์จบแล้ว -> ใช้สกอร์ซีรีส์จาก matches
  const useFallbackScore = completedCount === 0 && isFinal;
  const winsA = useFallbackScore ? fallbackScoreA : counted.winsA;
  const winsB = useFallbackScore ? fallbackScoreB : counted.winsB;
  const winsNeeded = Math.floor(totalGames / 2) + 1;
  const seriesOver = isFinal || winsA >= winsNeeded || winsB >= winsNeeded;
  const seriesWinner =
    winnerTeamId === teamA.id
      ? teamA
      : winnerTeamId === teamB.id
        ? teamB
        : winsA >= winsNeeded
          ? teamA
          : winsB >= winsNeeded
            ? teamB
            : null;
  const nextGame = seriesGames.find((g) => g.gameNumber === nextGameNumber);
  const stageLine = [stageName, roundLabel].filter(Boolean).join(" • ") || "—";

  // สรุปรวมทั้งซีรีส์ (เฉพาะแมตช์จบ)
  const players = isFinal ? aggregateSeriesStats(stats) : [];
  const hasStats = players.length > 0;
  const seriesMvp = pickSeriesMvp(players);
  const highlights = isFinal && hasStats ? seriesHighlights(players, stats) : [];
  const playersA = players.filter((p) => p.teamId === teamA.id);
  const playersB = players.filter((p) => p.teamId === teamB.id);
  const totalsA = teamSeriesTotals(players, teamA.id);
  const totalsB = teamSeriesTotals(players, teamB.id);
  const rounds = totalRounds(games);
  const showTotals = isFinal && (hasStats || completedCount > 0);

  const teamTextClass = (teamId: string | null | undefined) =>
    teamId === teamA.id ? TEAM_A_TEXT : teamId === teamB.id ? TEAM_B_TEXT : "text-gray-500";
  const teamTag = (teamId: string | null | undefined) =>
    teamId === teamA.id ? teamA.tag : teamId === teamB.id ? teamB.tag : "";

  const compact = isFinal;
  const showSeriesMvp = isFinal && seriesMvp;
  const showMvpColumn = Boolean(showSeriesMvp || mvp);

  return (
    <section className={`absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-30 ${isFinal ? "py-8 px-20" : "p-20"}`}>
      {/* SPONSOR TOWERS (ซ้าย: Title Sponsor / ขวา: Season cards) */}
      <SkyscraperTower position="LEFT_TOWER" />
      <SkyscraperTower position="RIGHT_TOWER" />

      <div className="flex gap-8 w-[1360px] items-stretch">
        <div className={`${showMvpColumn ? "flex-1 min-w-0" : "w-[1200px] mx-auto"} bg-[#12121A]/80 border border-gray-800 rounded-2xl p-8 relative shadow-2xl`}>
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent" />

          {/* HEADER + SERIES SCORE */}
          <div className={`flex justify-between items-center border-b border-white/5 ${compact ? "pb-5 mb-5" : "pb-6 mb-6"}`}>
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] tracking-wider uppercase font-bold">
                {seriesOver
                  ? "SERIES COMPLETE"
                  : completedCount > 0
                    ? `MAP ${completedCount} COMPLETE`
                    : "MAP SERIES RESULTS"}
              </span>
              <h2 className="text-3xl font-black text-white font-mono tracking-widest uppercase mt-2">
                {seriesOver ? "Match Complete" : "Match Intermission"}
              </h2>
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
          <div className={`grid grid-cols-4 gap-4 ${compact ? "mb-4" : "mb-6"}`}>
            <DetailCell label="Tournament" value={tournamentName || "—"} />
            <DetailCell label="Stage / Round" value={stageLine} />
            <DetailCell label="Match" value={`#${matchCode}`} valueClass="text-[#C9A84C] tracking-wider" />
            <DetailCell label="Format" value={`BO${totalGames} • FIRST TO ${winsNeeded}`} />
          </div>

          {/* ALL GAMES OF THE SERIES */}
          <div className={compact ? "space-y-2" : "space-y-3"}>
            {seriesGames.map(({ gameNumber, game, veto, mapName }) => {
              const done = isGameDone(game);
              const isLive = (game?.status || "").toUpperCase() === "LIVE";
              const isNext = gameNumber === nextGameNumber && !isLive && !isFinal;
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
                  className={`flex items-center justify-between rounded-xl border px-6 ${compact ? "py-2.5" : "py-4"} ${
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
                    <p className={`font-mono font-black text-white truncate ${compact ? "text-lg mt-0.5" : "text-xl mt-1"}`}>{mapName || "TBD"}</p>
                  </div>

                  <div className="flex items-center gap-5 font-mono">
                    {done && game ? (
                      <>
                        <span className={`${compact ? "text-2xl" : "text-3xl"} font-black ${game.score_a > game.score_b ? TEAM_A_TEXT : "text-neutral-600"}`}>{game.score_a}</span>
                        <span className="text-xs text-neutral-600">VS</span>
                        <span className={`${compact ? "text-2xl" : "text-3xl"} font-black ${game.score_b > game.score_a ? TEAM_B_TEXT : "text-neutral-600"}`}>{game.score_b}</span>
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

          {/* SERIES TOTALS (เฉพาะแมตช์จบ) */}
          {showTotals && (
            <div className="mt-4">
              <p className="text-[10px] font-mono font-black tracking-[0.2em] text-[#C9A84C] mb-2">SERIES TOTALS</p>
              <div className="grid grid-cols-6 gap-3">
                <CompareCell label="Maps" a={String(winsA)} b={String(winsB)} />
                <CompareCell label="Rounds" a={String(rounds.roundsA)} b={String(rounds.roundsB)} />
                <CompareCell label="Kills" a={hasStats ? String(totalsA.kills) : "–"} b={hasStats ? String(totalsB.kills) : "–"} />
                <CompareCell label="K/D" a={hasStats ? f2(totalsA.kd) : "–"} b={hasStats ? f2(totalsB.kd) : "–"} />
                <CompareCell label="First Bloods" a={hasStats ? String(totalsA.firstBloods) : "–"} b={hasStats ? String(totalsB.firstBloods) : "–"} />
                <CompareCell label="Avg ACS" a={hasStats ? f0(totalsA.avgAcs) : "–"} b={hasStats ? f0(totalsB.avgAcs) : "–"} />
              </div>
            </div>
          )}

          {/* PLAYER STATS TABLES (เฉพาะแมตช์จบ และมีสถิติ) */}
          {isFinal && hasStats && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <TeamStatsTable team={teamA} accent={TEAM_A_TEXT} players={playersA} />
              <TeamStatsTable team={teamB} accent={TEAM_B_TEXT} players={playersB} />
            </div>
          )}

          {/* NEXT UP / SERIES WINNER */}
          <div className={`${compact ? "mt-4" : "mt-6"} rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 px-6 py-3 text-center font-mono`}>
            {seriesOver && seriesWinner ? (
              <span className="text-sm font-black tracking-[0.2em] text-[#C9A84C]">
                SERIES WINNER • <span className={seriesWinner.id === teamA.id ? TEAM_A_TEXT : TEAM_B_TEXT}>{seriesWinner.name.toUpperCase()}</span>
              </span>
            ) : isFinal ? (
              <span className="text-sm font-black tracking-[0.2em] text-[#C9A84C]">MATCH COMPLETE • FINAL RESULT</span>
            ) : nextGame ? (
              <span className="text-sm font-black tracking-[0.2em] text-[#C9A84C]">
                NEXT UP • MAP {nextGame.gameNumber} • {nextGame.mapName?.toUpperCase()}
              </span>
            ) : (
              <span className="text-sm font-black tracking-[0.2em] text-neutral-500">AWAITING RESULT CONFIRMATION</span>
            )}
          </div>
        </div>

        {/* SERIES MVP (แมตช์จบ: รวมทั้งซีรีส์) */}
        {showSeriesMvp && seriesMvp && (
          <div className="w-[400px] bg-gradient-to-b from-[#12121A]/95 to-[#0A0A0F] border-2 border-[#C9A84C]/50 rounded-2xl p-7 relative overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#C9A84C] tracking-wider uppercase font-bold">
                SERIES MVP
              </span>
              <span className={`font-mono text-sm font-black ${teamTextClass(seriesMvp.teamId)}`}>{teamTag(seriesMvp.teamId)}</span>
            </div>

            <div className="text-center mb-5">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b1c2b] to-[#252740] border border-[#C9A84C]/30 text-white font-mono text-2xl font-black mb-3">
                {seriesMvp.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="font-mono text-2xl font-black text-white uppercase tracking-wider break-words">{seriesMvp.name}</h3>
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                AGENT: {seriesMvp.agents.join(" / ") || "—"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[
                { label: "K / D / A", value: `${seriesMvp.kills}/${seriesMvp.deaths}/${seriesMvp.assists}`, cls: "text-white" },
                { label: "K/D", value: f2(seriesMvp.kd), cls: "text-white" },
                { label: "AVG ACS", value: f0(seriesMvp.avgAcs), cls: "text-[#00D4FF]" },
                { label: "AVG ADR", value: f0(seriesMvp.avgAdr), cls: "text-white" },
                { label: "HS RATE", value: `${f0(seriesMvp.avgHs)}%`, cls: "text-[#C9A84C]" },
                { label: "FIRST BLOODS", value: String(seriesMvp.firstBloods), cls: "text-white" },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 rounded-lg p-2.5 text-center border border-white/5">
                  <p className="font-mono text-[8px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`font-mono text-sm font-black mt-1 ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="flex-1">
              <p className="font-mono text-[9px] tracking-[0.18em] text-gray-500 uppercase mb-2">ACS BY MAP</p>
              <div className="space-y-1.5">
                {seriesMvp.acsByGame.map((g) => (
                  <div key={g.gameNumber} className="flex justify-between items-center bg-white/5 rounded-md px-3 py-1.5 border border-white/5 font-mono text-[11px]">
                    <span className="text-gray-400 truncate">
                      MAP {g.gameNumber} <span className="text-gray-600">•</span> {(g.mapName || "—").toUpperCase()}
                    </span>
                    <span className="font-black text-[#00D4FF]">{f0(g.acs)}</span>
                  </div>
                ))}
              </div>

              {highlights.length > 0 && (
                <div className="mt-4">
                  <p className="font-mono text-[9px] tracking-[0.18em] text-[#C9A84C] uppercase mb-2">SERIES HIGHLIGHTS</p>
                  <div className="space-y-1.5">
                    {highlights.map((h) => (
                      <div key={h.key} className="flex items-center justify-between bg-white/5 rounded-md px-3 py-1.5 border border-white/5 font-mono">
                        <div className="min-w-0">
                          <p className="text-[8px] tracking-[0.16em] text-gray-500 uppercase leading-tight">{h.label}</p>
                          <p className="text-[11px] font-black truncate leading-tight mt-0.5">
                            <span className={teamTextClass(h.teamId)}>{h.playerName}</span>
                            {h.detail && <span className="font-normal text-gray-600"> • {h.detail}</span>}
                          </p>
                        </div>
                        <span className="text-sm font-black text-[#C9A84C] ml-3">{h.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-3 mt-4 text-center">
              <span className="font-mono text-[9px] text-neutral-500 uppercase">ZODIAC ARENA PERFORMANCE ENGINE</span>
            </div>
          </div>
        )}

        {/* MVP FOR CURRENT MAP (ระหว่างซีรีส์ / ไม่มีสถิติรวม) */}
        {!showSeriesMvp && mvp && (
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
