// components/overlay/LiveScoreboard.tsx
// OBS broadcast overlay: แถบสกอร์บนสุดของฉาก LIVE — ชื่อทีม/โลโก้, จุดชนะซีรีส์, สกอร์รอบ, แมพที่กำลังแข่ง
"use client";

import React from "react";
import { TEAM_A_HEX, TEAM_B_HEX } from "@/components/overlay/series";

export interface LiveScoreboardTeam {
  tag: string;
  logo_url: string | null;
}

export interface LiveScoreboardProps {
  teamA: LiveScoreboardTeam;
  teamB: LiveScoreboardTeam;
  // จำนวนแมพที่ต้องชนะเพื่อชนะซีรีส์ (BO3 = 2, BO5 = 3)
  winsNeeded: number;
  winsA: number;
  winsB: number;
  roundsA: number;
  roundsB: number;
  // เช่น "MAP 2" และชื่อแมพ (ว่างได้ถ้ายังไม่ทราบ)
  mapLabel: string;
  mapName: string | null;
}

function TeamLogo({ team, hex }: { team: LiveScoreboardTeam; hex: string }) {
  return (
    <div className="h-8 w-8 flex items-center justify-center bg-gray-900 border border-white/10 rounded-md overflow-hidden">
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo_url} alt={team.tag} className="h-full w-full object-contain" />
      ) : (
        <span className="font-mono text-[11px] font-black" style={{ color: hex }}>
          {team.tag.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SeriesDots({ total, filled, hex }: { total: number; filled: number; hex: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: Math.max(1, total) }).map((_, i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full"
          style={i < filled ? { backgroundColor: hex, boxShadow: `0 0 8px ${hex}` } : { backgroundColor: "#262626" }}
        />
      ))}
    </div>
  );
}

export function LiveScoreboard({ teamA, teamB, winsNeeded, winsA, winsB, roundsA, roundsB, mapLabel, mapName }: LiveScoreboardProps) {
  return (
    <section className="absolute top-0 left-1/2 -translate-x-1/2 flex items-stretch h-[56px] w-[580px] bg-[#0A0A0F]/90 backdrop-blur-md border-b-2 border-[#C9A84C]/80 rounded-b-xl z-50 overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
      {/* TEAM A */}
      <div
        className="flex-1 flex items-center justify-end px-4 gap-3"
        style={{ backgroundImage: `linear-gradient(to right, transparent, ${TEAM_A_HEX}0D)` }}
      >
        <span className="font-mono text-lg font-black tracking-widest text-white uppercase">{teamA.tag}</span>
        <TeamLogo team={teamA} hex={TEAM_A_HEX} />
        <SeriesDots total={winsNeeded} filled={winsA} hex={TEAM_A_HEX} />
      </div>

      {/* ROUNDS SCORE + MAP */}
      <div className="w-[140px] flex items-center justify-center border-x border-white/10 relative">
        <div className="flex items-center gap-4">
          <span className="font-mono text-3xl font-black tracking-tighter leading-none w-10 text-right" style={{ color: TEAM_A_HEX }}>
            {roundsA}
          </span>
          <span className="font-mono text-xs font-bold text-gray-500 tracking-widest">VS</span>
          <span className="font-mono text-3xl font-black tracking-tighter leading-none w-10 text-left" style={{ color: TEAM_B_HEX }}>
            {roundsB}
          </span>
        </div>
        <span className="absolute bottom-1 font-mono text-[8px] font-black text-[#C9A84C] uppercase tracking-[2px] whitespace-nowrap">
          {mapLabel}
          {mapName ? ` • ${mapName}` : ""}
        </span>
      </div>

      {/* TEAM B */}
      <div
        className="flex-1 flex items-center justify-start px-4 gap-3"
        style={{ backgroundImage: `linear-gradient(to left, transparent, ${TEAM_B_HEX}0D)` }}
      >
        <SeriesDots total={winsNeeded} filled={winsB} hex={TEAM_B_HEX} />
        <TeamLogo team={teamB} hex={TEAM_B_HEX} />
        <span className="font-mono text-lg font-black tracking-widest text-white uppercase">{teamB.tag}</span>
      </div>
    </section>
  );
}
