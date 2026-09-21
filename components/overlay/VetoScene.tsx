// components/overlay/VetoScene.tsx
// OBS broadcast overlay: Map Veto scene (ฉาก VETO ของ /overlay/match/[id])
// รวม Sponsor Tower ซ้าย/ขวา + รายละเอียดแมตช์ + ลำดับแมพของซีรีส์ทั้งหมด (BO1/BO3/BO5)
"use client";

import React, { useEffect, useState } from "react";
import { SkyscraperTower } from "@/components/sponsor/SkyscraperTower";
import { parseVetoFormat, type VetoStep } from "@/lib/veto/engine";
import {
  DetailCell,
  TEAM_A_TEXT,
  TEAM_B_TEXT,
  buildSeriesGames,
  isGameDone,
  type OverlayGame,
  type OverlayTeam,
  type OverlayVeto,
} from "@/components/overlay/series";

export interface VetoSceneProps {
  teamA: OverlayTeam;
  teamB: OverlayTeam;
  bestOf: number;
  matchCode: string;
  tournamentName: string | null;
  stageName: string | null;
  roundLabel: string | null;
  seriesScoreA: number;
  seriesScoreB: number;
  vetoes: OverlayVeto[];
  games: OverlayGame[];
  // ลำดับสเต็ปจาก tournament_stages.veto_format (ไม่ส่งมา = ลำดับเริ่มต้น 5 สเต็ป)
  steps?: VetoStep[];
  // เวลาหมดของสเต็ปปัจจุบัน (ms) — ไม่ส่ง/ null = ไม่แสดงเวลา
  deadlineMs?: number | null;
}

// ลำดับสเต็ปเริ่มต้นเมื่อไม่มี veto_format (BAN, BAN, PICK, PICK, DECIDER)
const DEFAULT_STEPS: VetoStep[] = parseVetoFormat(null).steps;

function actionBadgeClass(action: string): string {
  return action === "BAN"
    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
    : action === "PICK"
      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30";
}

export function VetoScene({
  teamA,
  teamB,
  bestOf,
  matchCode,
  tournamentName,
  stageName,
  roundLabel,
  seriesScoreA,
  seriesScoreB,
  vetoes,
  games,
  steps,
  deadlineMs = null,
}: VetoSceneProps) {
  const stepList = steps && steps.length > 0 ? steps : DEFAULT_STEPS;
  const isComplete = vetoes.length >= stepList.length;

  // นับเวลาถอยหลังของสเต็ปปัจจุบัน (อัปเดตทุกวินาที)
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (deadlineMs === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadlineMs]);
  const teamTextClass = (teamId: string | null) =>
    teamId === teamA.id ? TEAM_A_TEXT : teamId === teamB.id ? TEAM_B_TEXT : "text-gray-500";
  const teamTag = (teamId: string | null) =>
    teamId === teamA.id ? teamA.tag : teamId === teamB.id ? teamB.tag : "DECIDER";

  const { totalGames, seriesGames, nextGameNumber } = buildSeriesGames(bestOf, vetoes, games);

  const stageLine = [stageName, roundLabel].filter(Boolean).join(" • ") || "—";

  return (
    <section className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-30 p-20">
      {/* SPONSOR TOWERS (ซ้าย: Title Sponsor / ขวา: Season cards) */}
      <SkyscraperTower position="LEFT_TOWER" />
      <SkyscraperTower position="RIGHT_TOWER" />

      <div className="w-[1200px] bg-[#12121A]/80 border border-gray-800 rounded-2xl p-8 relative shadow-[0_0_50px_rgba(0,212,255,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/40 to-transparent" />

        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-6">
          <div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF] tracking-wider uppercase font-bold">
              {isComplete ? "VETO COMPLETE" : "BAN/PICK STAGE ACTIVE"}
            </span>
            <h2 className="text-3xl font-black text-white font-mono tracking-widest uppercase mt-2">
              Map Veto Dashboard
            </h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500 font-mono">BO{totalGames} SERIES CONFIG</p>
            <p className="text-sm font-black font-mono mt-1 text-[#C9A84C]">
              <span className={TEAM_A_TEXT}>{teamA.tag}</span> VS <span className={TEAM_B_TEXT}>{teamB.tag}</span>
            </p>
          </div>
        </div>

        {/* MATCH DETAILS */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <DetailCell label="Tournament" value={tournamentName || "—"} />
          <DetailCell label="Stage / Round" value={stageLine} />
          <DetailCell label="Match" value={`#${matchCode}`} valueClass="text-[#C9A84C] tracking-wider" />
          <div className="rounded-xl border border-white/5 bg-[#0D0E1A]/60 px-4 py-3 min-w-0">
            <p className="text-[9px] font-mono tracking-[0.16em] text-neutral-500 uppercase">Format • Series</p>
            <p className="mt-1 text-sm font-black font-mono text-white">
              BO{totalGames} <span className="text-neutral-600">•</span>{" "}
              <span className={TEAM_A_TEXT}>{seriesScoreA}</span> <span className="text-neutral-600">–</span>{" "}
              <span className={TEAM_B_TEXT}>{seriesScoreB}</span>
            </p>
          </div>
        </div>

        {/* VETO STEPS (จำนวนและลำดับตาม tournament_stages.veto_format) */}
        <div className="grid gap-4 mb-7" style={{ gridTemplateColumns: `repeat(${stepList.length}, minmax(0, 1fr))` }}>
          {stepList.map((planned) => {
            const stepOrder = planned.step;
            const activeVeto = vetoes.find((v) => v.step_order === stepOrder);
            const isCurrent = !activeVeto && stepOrder === vetoes.length + 1;
            const plannedTeamId = planned.team === "A" ? teamA.id : planned.team === "B" ? teamB.id : null;
            const secondsLeft = isCurrent && deadlineMs !== null ? Math.max(0, Math.ceil((deadlineMs - now) / 1000)) : null;
            const badgeAction = activeVeto?.action ?? planned.action;

            return (
              <div
                key={stepOrder}
                className={`rounded-xl border p-4 flex flex-col justify-between h-[180px] transition-all duration-300 ${
                  isCurrent
                    ? "border-[#C9A84C] bg-[#C9A84C]/5 shadow-[0_0_15px_rgba(201,168,76,0.15)]"
                    : activeVeto
                      ? "border-white/5 bg-[#0D0E1A]/40"
                      : "border-white/5 bg-transparent opacity-40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-black text-gray-500">#{stepOrder}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest ${actionBadgeClass(badgeAction)} ${activeVeto ? "" : "opacity-70"}`}>
                    {badgeAction}
                  </span>
                </div>

                <div className="my-4 text-center">
                  <p className="font-mono text-sm font-bold text-white truncate">
                    {activeVeto ? activeVeto.map_name : isCurrent ? (planned.action === "DECIDER" ? "DECIDING..." : "WAITING...") : "—"}
                  </p>
                  <p
                    className={`font-mono text-[9px] mt-1 uppercase font-bold ${
                      activeVeto ? teamTextClass(activeVeto.team_id) : teamTextClass(plannedTeamId)
                    }`}
                  >
                    {activeVeto ? teamTag(activeVeto.team_id) : plannedTeamId ? teamTag(plannedTeamId) : "SYSTEM"}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-2 text-[9px] font-mono text-center">
                  {activeVeto?.action === "DECIDER" ? (
                    <span className="text-amber-500/80 font-bold">AUTO DECIDER</span>
                  ) : activeVeto?.was_auto ? (
                    <span className="text-amber-500/80 animate-pulse font-bold">AUTO TIMEOUT</span>
                  ) : activeVeto ? (
                    <span className="text-neutral-500">SELECTION LOCKED</span>
                  ) : isCurrent && secondsLeft !== null ? (
                    <span className={`font-bold tabular-nums ${secondsLeft <= 10 ? "text-rose-400 animate-pulse" : "text-[#C9A84C]"}`}>
                      CHOOSING... {secondsLeft}s
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[#C9A84C] animate-pulse font-bold">CHOOSING...</span>
                  ) : (
                    <span className="text-neutral-700">UPCOMING</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* SERIES MAP ORDER (ทุกเกมของซีรีส์) */}
        <div className="flex items-center gap-4 mb-3.5">
          <span className="text-[10px] font-mono font-black tracking-[0.2em] text-[#C9A84C]">SERIES MAP ORDER</span>
          <span className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono tracking-[0.14em] text-neutral-500">
            FIRST TO {Math.floor(totalGames / 2) + 1} MAP WINS
          </span>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${totalGames}, minmax(0, 1fr))` }}>
          {seriesGames.map(({ gameNumber, game, veto, mapName, gameStatus }) => {
            const hasMap = Boolean(mapName);
            const isLive = gameStatus === "LIVE";
            const isDone = isGameDone(game);
            const showScore = Boolean(game) && (isLive || isDone);
            const statusLabel = isLive
              ? "LIVE"
              : isDone
                ? "COMPLETED"
                : !hasMap
                  ? "PENDING"
                  : gameNumber === nextGameNumber
                    ? "UP NEXT"
                    : "UPCOMING";
            const statusClass = isLive
              ? "text-red-400 border-red-500/50 bg-red-500/10 animate-pulse"
              : isDone
                ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                : statusLabel === "UP NEXT"
                  ? "text-[#C9A84C] border-[#C9A84C]/50 bg-[#C9A84C]/10"
                  : "text-neutral-500 border-white/10";
            const byLabel = veto?.action === "DECIDER" ? "MAP FROM" : "PICKED BY";
            const byText = veto ? teamTag(veto.action === "DECIDER" ? null : veto.team_id) : "AWAITING VETO";

            return (
              <div
                key={gameNumber}
                className={`rounded-xl border px-5 py-4 ${
                  hasMap ? "border-white/10 bg-[#0D0E1A]/60" : "border-white/5 opacity-40"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-black tracking-[0.16em] text-gray-400">GAME {gameNumber}</span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-black tracking-[0.14em] ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-2.5 text-2xl font-black font-mono tracking-wide text-white truncate">{mapName || "TBD"}</p>
                <div className="flex justify-between items-center mt-2.5">
                  <span className="text-[10px] font-mono tracking-widest text-gray-500">
                    {veto ? `${byLabel} ` : ""}
                    <span className={`font-black ${veto ? (veto.action === "DECIDER" ? "text-cyan-400" : teamTextClass(veto.team_id)) : "text-gray-600"}`}>
                      {byText}
                    </span>
                  </span>
                  <span className="text-xl font-black font-mono text-gray-500">
                    {showScore && game ? (
                      <>
                        <span className={game.score_a > game.score_b ? TEAM_A_TEXT : "text-gray-500"}>{game.score_a}</span>
                        {" : "}
                        <span className={game.score_b > game.score_a ? TEAM_B_TEXT : "text-gray-500"}>{game.score_b}</span>
                      </>
                    ) : (
                      "– : –"
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
