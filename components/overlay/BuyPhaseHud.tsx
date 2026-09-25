"use client";

import React from "react";
import { TEAM_A_HEX, TEAM_B_HEX } from "@/components/overlay/series";
import { AgentPortrait } from "@/components/overlay/AgentPortrait";
import { RoundTimeline, type RoundResult } from "@/components/overlay/RoundTimeline";
import { Shield } from "lucide-react";

export interface BuyPhasePlayer {
  id: string;
  name: string;
  agent?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  hp?: number;
  hpMax?: number;
  credits?: number;
  minNext?: number;
  armor?: "NONE" | "LIGHT" | "HEAVY";
  weapon?: string;
  ultPoints?: number;
  ultMax?: number;
}

interface HudTeam {
  name: string;
  tag: string;
}

const initials = (p: BuyPhasePlayer) => (p.agent || p.name).slice(0, 2).toUpperCase();

function ShieldIcon({ type }: { type: "HEAVY" | "LIGHT" | "NONE" }) {
  if (type === "HEAVY") {
    return <Shield className="w-3.5 h-3.5 text-[#00D4FF]" />;
  }
  if (type === "LIGHT") {
    return <Shield className="w-3.5 h-3.5 text-cyan-300" />;
  }
  return <div className="w-3.5 h-3.5 opacity-10" />;
}

function UltCircle({ current, max }: { current: number; max: number }) {
  const isReady = current >= max;
  return (
    <div className="relative w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white leading-none">
        {isReady ? "X" : `${current}/${max}`}
      </span>
      {isReady && <div className="absolute inset-0 rounded-full border-2 border-[#00D4FF] animate-pulse" />}
    </div>
  );
}

function PlayerRow({ player, hex, isMirrored }: { player: BuyPhasePlayer; hex: string; isMirrored: boolean }) {
  return (
    <div className={`flex items-center bg-[#13161c] h-[40px] px-2 border-l border-r border-white/5 ${isMirrored ? "flex-row-reverse" : ""}`}>
      {/* KDA */}
      <div className={`w-[80px] text-center font-mono text-[11px] font-bold text-white/80 ${isMirrored ? "text-right" : "text-left"} px-4`}>
        {player.kills} / {player.deaths} / {player.assists}
      </div>

      {/* Name and Portrait */}
      <div className={`flex-1 flex items-center gap-3 ${isMirrored ? "justify-end" : "justify-start"} px-2`}>
        {!isMirrored && (
          <div className="w-8 h-8 rounded overflow-hidden">
            <AgentPortrait agent={player.agent} fallbackText={initials(player)} hex={hex} size="sm" />
          </div>
        )}
        <span className="font-bold text-sm text-white truncate w-[100px] text-left">{player.name}</span>
        {isMirrored && (
          <div className="w-8 h-8 rounded overflow-hidden">
            <AgentPortrait agent={player.agent} fallbackText={initials(player)} hex={hex} size="sm" />
          </div>
        )}
      </div>

      {/* Ultimate */}
      <div className="w-[60px] flex items-center justify-center">
        {typeof player.ultMax === "number" && (
          <UltCircle current={player.ultPoints ?? 0} max={player.ultMax} />
        )}
      </div>

      {/* Weapon & Shield */}
      <div className="w-[120px] flex items-center justify-center gap-3">
        {player.armor && <ShieldIcon type={player.armor} />}
        {player.weapon && (
          <span className="text-white font-bold text-[10px] uppercase tracking-widest">{player.weapon}</span>
        )}
      </div>

      {/* Credits */}
      <div className={`w-[100px] font-mono font-bold text-xs ${isMirrored ? "text-left" : "text-right"} px-2`}>
        <span className="opacity-60 pr-1">¤</span>
        {player.credits?.toLocaleString() ?? "0"}
      </div>
    </div>
  );
}

export function BuyPhaseHud({
  visible,
  teamA,
  teamB,
  rosterA,
  rosterB,
  roundNumber,
  roundsWonA,
  roundsWonB,
  roundHistory,
  teamAId,
  teamBId,
}: {
  visible: boolean;
  teamA: HudTeam | undefined;
  teamB: HudTeam | undefined;
  rosterA: BuyPhasePlayer[];
  rosterB: BuyPhasePlayer[];
  /** เลขรอบปัจจุบัน (rounds_won_a + rounds_won_b + 1) — โชว์ไว้เหนือ Buy Phase ให้รู้ว่ากำลังซื้อของก่อนรอบไหน */
  roundNumber?: number;
  /** สกอร์รอบสะสมจริงของแมพนี้ (rounds_won_a / rounds_won_b จาก matches) โชว์คู่กับ Buy Phase */
  roundsWonA?: number;
  roundsWonB?: number;
  /** ผลรายรอบจริงจากตาราง match_rounds (ไม่มี fallback ปลอม — รอบที่ยังไม่มีผลจะเว้นว่าง) */
  roundHistory?: RoundResult[];
  teamAId?: string | null;
  teamBId?: string | null;
}) {
  return (
    <section
      className={`absolute bottom-[100px] left-1/2 -translate-x-1/2 w-[1600px] z-50 transition-all duration-500 transform pointer-events-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
    >
      {typeof roundNumber === "number" && (
        <div className="flex items-center justify-center gap-3 mb-1.5">
          {typeof roundsWonA === "number" && typeof roundsWonB === "number" && (
            <span className="px-3 py-1 rounded-full bg-[#1a1e26]/95 border border-white/15 font-mono text-[11px] font-black shadow-lg">
              <span style={{ color: TEAM_A_HEX }}>{teamA?.tag ?? "A"} {roundsWonA}</span>
              <span className="text-white/40 mx-1.5">-</span>
              <span style={{ color: TEAM_B_HEX }}>{roundsWonB} {teamB?.tag ?? "B"}</span>
            </span>
          )}
          <span className="px-4 py-1 rounded-full bg-[#1a1e26]/95 border border-white/15 font-mono text-[11px] font-black text-white/80 uppercase tracking-[3px] shadow-lg">
            Round {roundNumber} — Buy Phase
          </span>
        </div>
      )}

      {roundHistory && teamA && teamB && (
        <div className="flex justify-center mb-2">
          <RoundTimeline
            rounds={roundHistory}
            teamA={{ id: teamAId, tag: teamA.tag }}
            teamB={{ id: teamBId, tag: teamB.tag }}
            currentRound={roundNumber}
          />
        </div>
      )}
      <div className="flex bg-[#0f121a]/90 backdrop-blur-md border-t border-white/20 shadow-2xl overflow-hidden rounded-xl">
        {/* TEAM A */}
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-1" style={{ backgroundColor: TEAM_A_HEX }} />
          {rosterA.map((player) => (
            <PlayerRow key={player.id} player={player} hex={TEAM_A_HEX} isMirrored={false} />
          ))}
        </div>

        {/* TEAM B */}
        <div className="flex-1 flex flex-col gap-0.5 border-l border-white/10">
          <div className="h-1" style={{ backgroundColor: TEAM_B_HEX }} />
          {rosterB.map((player) => (
            <PlayerRow key={player.id} player={player} hex={TEAM_B_HEX} isMirrored={true} />
          ))}
        </div>
      </div>
    </section>
  );
}
