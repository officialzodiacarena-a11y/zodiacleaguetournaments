// components/overlay/PreMatchScene.tsx
// OBS broadcast overlay: ฉากก่อนแข่ง — เดิมสถานะ SCHEDULED / READY_CHECK ไม่มีฉากเลย (โปร่งใส)
// mode="COUNTDOWN"   สถานะ SCHEDULED — นับถอยหลังจาก matches.scheduled_at จริง (ไม่มีค่า = ไม่แสดงตัวเลขปลอม)
// mode="READY_CHECK" สถานะ READY_CHECK — READY/WAITING ต่อทีมจริงจาก team_a_ready_at / team_b_ready_at
"use client";

import React, { useEffect, useState } from "react";
import { SkyscraperTower } from "@/components/sponsor/SkyscraperTower";
import { DetailCell, TEAM_A_HEX, TEAM_B_HEX, TEAM_A_TEXT, TEAM_B_TEXT } from "@/components/overlay/series";

export interface PreMatchTeam {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
}

export interface PreMatchSceneProps {
  mode: "COUNTDOWN" | "READY_CHECK";
  teamA: PreMatchTeam;
  teamB: PreMatchTeam;
  bestOf: number;
  matchCode: string;
  tournamentName: string | null;
  stageName: string | null;
  roundLabel: string | null;
  scheduledAt: string | null;
  teamAReadyAt: string | null;
  teamBReadyAt: string | null;
}

function TeamCrest({ team, hex }: { team: PreMatchTeam; hex: string }) {
  return (
    <div
      className="h-32 w-32 flex items-center justify-center bg-[#0D0E1A]/80 border-2 rounded-3xl overflow-hidden shadow-2xl"
      style={{ borderColor: `${hex}80` }}
    >
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo_url} alt={team.tag} className="h-full w-full object-contain p-3" />
      ) : (
        <span className="font-mono text-3xl font-black" style={{ color: hex }}>
          {team.tag.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function ReadyPill({ readyAt, hex }: { readyAt: string | null; hex: string }) {
  const isReady = Boolean(readyAt);
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-mono font-black tracking-[0.2em] uppercase border ${
        isReady ? "animate-none" : "animate-pulse"
      }`}
      style={
        isReady
          ? { color: hex, borderColor: `${hex}80`, backgroundColor: `${hex}1A` }
          : { color: "#6b7280", borderColor: "#37415180", backgroundColor: "#1118271A" }
      }
    >
      {isReady ? "READY" : "WAITING"}
    </span>
  );
}

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "STARTING NOW";
  const totalSeconds = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PreMatchScene({
  mode,
  teamA,
  teamB,
  bestOf,
  matchCode,
  tournamentName,
  stageName,
  roundLabel,
  scheduledAt,
  teamAReadyAt,
  teamBReadyAt,
}: PreMatchSceneProps) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (mode !== "COUNTDOWN" || !scheduledAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [mode, scheduledAt]);

  const scheduledMs = scheduledAt ? new Date(scheduledAt).getTime() : null;
  const stageLine = [stageName, roundLabel].filter(Boolean).join(" • ") || "—";

  return (
    <section className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-30 p-20">
      <SkyscraperTower position="LEFT_TOWER" />
      <SkyscraperTower position="RIGHT_TOWER" />

      <div className="w-[1200px] bg-[#12121A]/80 border border-gray-800 rounded-2xl p-10 relative shadow-[0_0_50px_rgba(0,212,255,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent" />

        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-8">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] tracking-wider uppercase font-bold">
            {mode === "COUNTDOWN" ? "STARTING SOON" : "READY CHECK"}
          </span>
          <p className="text-xs text-neutral-500 font-mono">BO{Math.max(1, bestOf)} SERIES</p>
        </div>

        {/* MATCH DETAILS */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <DetailCell label="Tournament" value={tournamentName || "—"} />
          <DetailCell label="Stage / Round" value={stageLine} />
          <DetailCell label="Match" value={`#${matchCode}`} valueClass="text-[#C9A84C] tracking-wider" />
        </div>

        {/* MATCHUP */}
        <div className="grid grid-cols-11 gap-4 items-center">
          <div className="col-span-5 flex flex-col items-center gap-4 text-center">
            <TeamCrest team={teamA} hex={TEAM_A_HEX} />
            <h2 className={`text-2xl font-black font-mono uppercase tracking-wide truncate max-w-full ${TEAM_A_TEXT}`}>{teamA.name}</h2>
            {mode === "READY_CHECK" && <ReadyPill readyAt={teamAReadyAt} hex={TEAM_A_HEX} />}
          </div>

          <div className="col-span-1 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rotate-45 bg-black border-2 border-[#C9A84C] flex items-center justify-center shadow-[0_0_20px_rgba(201,168,76,0.4)]">
              <span className="-rotate-45 font-mono text-base font-black text-[#C9A84C]">VS</span>
            </div>
          </div>

          <div className="col-span-5 flex flex-col items-center gap-4 text-center">
            <TeamCrest team={teamB} hex={TEAM_B_HEX} />
            <h2 className={`text-2xl font-black font-mono uppercase tracking-wide truncate max-w-full ${TEAM_B_TEXT}`}>{teamB.name}</h2>
            {mode === "READY_CHECK" && <ReadyPill readyAt={teamBReadyAt} hex={TEAM_B_HEX} />}
          </div>
        </div>

        {/* COUNTDOWN (เฉพาะ mode COUNTDOWN และมี scheduled_at จริง) */}
        {mode === "COUNTDOWN" && (
          <div className="mt-10 text-center">
            <p className="font-mono text-xs font-black tracking-[0.3em] text-neutral-400 uppercase mb-2">
              {scheduledMs ? "STARTING IN" : "SCHEDULE"}
            </p>
            <p className="text-6xl font-black font-mono tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              {scheduledMs ? formatCountdown(scheduledMs - now) : "TBD"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
