// components/overlay/LiveRosterSidebar.tsx
// OBS broadcast overlay: แถบรายชื่อผู้เล่นซ้าย/ขวาของฉาก LIVE
// แสดงหลอดเลือด HP, ตัวเลขพลังชีวิต, ตัวละคร, ปืน, เกราะ และอัลติเมท ตรงตามมาตรฐานการแข่งขัน
"use client";

import React from "react";
import { TEAM_A_HEX, TEAM_B_HEX } from "@/components/overlay/series";
import { AgentPortrait } from "@/components/overlay/AgentPortrait";
import type { BuyPhasePlayer } from "@/components/overlay/BuyPhaseHud";
import { Shield, Sparkles } from "lucide-react";

export function LiveRosterSidebar({ roster, side, team }: { roster: BuyPhasePlayer[]; side: "left" | "right"; team: "A" | "B" }) {
  const hex = team === "A" ? TEAM_A_HEX : TEAM_B_HEX;
  const isLeft = side === "left";

  return (
    <section className={`absolute ${isLeft ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 flex flex-col gap-2 z-40 w-[310px]`}>
      {roster.map((player) => {
        const hp = typeof player.hp === "number" ? player.hp : 100;
        const hpMax = typeof player.hpMax === "number" ? player.hpMax : 100;
        const hpPercent = Math.max(0, Math.min(100, (hp / hpMax) * 100));
        const isDead = hp <= 0;

        return (
          <div
            key={player.id}
            className={`relative flex flex-col bg-[#0b0c13]/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${
              isDead ? "opacity-50 grayscale" : "hover:border-white/30"
            }`}
            style={{
              boxShadow: isDead ? "none" : `0 4px 15px -3px ${hex}30`,
              borderLeftWidth: isLeft ? "3px" : "1px",
              borderRightWidth: !isLeft ? "3px" : "1px",
              borderLeftColor: isLeft ? hex : undefined,
              borderRightColor: !isLeft ? hex : undefined,
            }}
          >
            {/* Top row: HP, Name, Portrait */}
            <div className={`flex items-center gap-2.5 px-2.5 py-1.5 ${isLeft ? "" : "flex-row-reverse"}`}>
              {/* Agent Portrait */}
              <div className="relative shrink-0">
                <AgentPortrait
                  agent={player.agent}
                  fallbackText={(player.agent || player.name).slice(0, 2).toUpperCase()}
                  hex={hex}
                  size="sm"
                />
                {player.armor && player.armor !== "NONE" && (
                  <div className="absolute -bottom-1 -right-1 bg-black/80 rounded-full p-0.5 border border-white/30">
                    <Shield className={`w-2.5 h-2.5 ${player.armor === "HEAVY" ? "text-cyan-400" : "text-amber-400"}`} />
                  </div>
                )}
              </div>

              {/* Player Name & Info */}
              <div className={`flex-1 min-w-0 ${isLeft ? "text-left" : "text-right"}`}>
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="text-xs font-black text-white truncate font-sans tracking-wide">
                    {player.name}
                  </span>
                  {/* Numeric HP Badge */}
                  <span
                    className={`font-mono font-black text-xs px-1.5 py-0.2 rounded border ${
                      isDead
                        ? "bg-neutral-800 text-neutral-400 border-neutral-700"
                        : hp <= 30
                        ? "bg-rose-950/80 text-rose-400 border-rose-600/50"
                        : hp <= 60
                        ? "bg-amber-950/80 text-amber-300 border-amber-500/50"
                        : "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                    }`}
                  >
                    {isDead ? "0" : hp}
                  </span>
                </div>

                {/* Sub-row: Weapon, Credits, Ult */}
                <div className={`flex items-center gap-2 text-[10px] font-mono mt-0.5 ${isLeft ? "" : "justify-end"}`}>
                  {player.weapon && (
                    <span className="text-neutral-300 font-bold tracking-tight bg-white/5 px-1 py-0.2 rounded">
                      {player.weapon}
                    </span>
                  )}
                  {typeof player.credits === "number" && (
                    <span className="text-amber-400 font-bold">
                      ¤ {player.credits}
                    </span>
                  )}
                  {typeof player.ultPoints === "number" && (
                    <span className="flex items-center gap-0.5 text-cyan-300 font-bold">
                      <Sparkles className="w-2.5 h-2.5" />
                      {player.ultPoints}/{player.ultMax || 8}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Health Bar (Bottom of card) */}
            <div className="h-1.5 w-full bg-black/60 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isDead
                    ? "bg-neutral-700"
                    : hpPercent <= 30
                    ? "bg-gradient-to-r from-rose-600 to-rose-400"
                    : hpPercent <= 60
                    ? "bg-gradient-to-r from-amber-600 to-amber-400"
                    : isLeft
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-l from-emerald-500 to-teal-400"
                }`}
                style={{
                  width: `${hpPercent}%`,
                  float: isLeft ? "left" : "right",
                }}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
