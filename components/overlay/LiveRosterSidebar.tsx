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
    <section className={`absolute ${isLeft ? "left-6" : "right-6"} bottom-[60px] flex flex-col gap-1.5 z-40 w-[340px]`}>
      {roster.map((player) => {
        const hp = typeof player.hp === "number" ? player.hp : 100;
        const hpMax = typeof player.hpMax === "number" ? player.hpMax : 100;
        const hpPercent = Math.max(0, Math.min(100, (hp / hpMax) * 100));
        const isDead = hp <= 0;

        return (
          <div
            key={player.id}
            className={`flex bg-[#0f121a]/95 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-300 ${
              isLeft ? "flex-row" : "flex-row-reverse"
            } ${isDead ? "opacity-30 grayscale brightness-50" : ""}`}
            style={{
              boxShadow: isDead ? "none" : `0 4px 15px -3px ${hex}20`,
            }}
          >
            {/* Agent Portrait (Outer edge) */}
            <div className="relative w-[60px] shrink-0 bg-black/40 border-r border-white/5">
              <AgentPortrait
                agent={player.agent}
                fallbackText={(player.agent || player.name).slice(0, 2).toUpperCase()}
                hex={hex}
                size="md"
              />
              {/* Optional outer color accent line */}
              <div
                className={`absolute inset-y-0 ${isLeft ? "left-0" : "right-0"} w-1`}
                style={{ backgroundColor: hex }}
              />
            </div>

            {/* Info Block */}
            <div className="flex-1 flex flex-col justify-between py-1.5 px-3 min-w-0">

              {/* Top Row: HP and Name */}
              <div className={`flex items-center justify-between mb-1 ${isLeft ? "" : "flex-row-reverse"}`}>
                <span className={`text-2xl font-black leading-none ${isDead ? "text-neutral-500" : "text-white"}`}>
                  {isDead ? "0" : hp}
                </span>
                <span className="text-sm font-bold text-white truncate max-w-[140px] tracking-wide">
                  {player.name}
                </span>
              </div>

              {/* Middle Row: Health Bar */}
              <div className="h-1.5 w-full bg-black/60 overflow-hidden rounded-full mb-1.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    isDead
                      ? "bg-neutral-700"
                      : hpPercent <= 30
                      ? "bg-rose-500"
                      : hpPercent <= 60
                      ? "bg-amber-500"
                      : "bg-[#00D4FF]" // Teal/Cyan color for healthy
                  }`}
                  style={{
                    width: `${hpPercent}%`,
                    float: isLeft ? "left" : "right",
                  }}
                />
              </div>

              {/* Bottom Row: Credits, Weapon, Ult */}
              <div className={`flex items-center justify-between text-[11px] font-mono ${isLeft ? "" : "flex-row-reverse"}`}>
                {/* Credits */}
                <div className="flex items-center gap-1 text-neutral-100 font-bold min-w-[50px] justify-start">
                  <span className="opacity-60">¤</span>
                  <span>{typeof player.credits === "number" ? player.credits : "0"}</span>
                </div>

                {/* Weapon (Text fallback if no icon) */}
                <div className="flex items-center justify-center flex-1">
                  {player.weapon && (
                    <span className="text-neutral-300 font-bold tracking-widest uppercase">
                      {player.weapon}
                    </span>
                  )}
                </div>

                {/* Armor & Ultimate */}
                <div className={`flex items-center gap-3 ${isLeft ? "justify-end" : "justify-start"}`}>
                  {player.armor && player.armor !== "NONE" && (
                    <Shield className={`w-3 h-3 ${player.armor === "HEAVY" ? "text-[#00D4FF]" : "text-amber-400"}`} />
                  )}
                  {typeof player.ultPoints === "number" && (
                    <div className="flex items-center gap-1 font-bold text-cyan-300 bg-white/5 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{player.ultPoints}/{player.ultMax || 8}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </section>
  );
}
