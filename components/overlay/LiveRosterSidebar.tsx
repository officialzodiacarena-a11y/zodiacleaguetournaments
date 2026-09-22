// components/overlay/LiveRosterSidebar.tsx
// OBS broadcast overlay: แถบรายชื่อผู้เล่นซ้าย/ขวาของฉาก LIVE — ใช้ชื่อจริง (และตัวละครถ้าทราบ)
// HP มาจาก Observer Bridge (stream_telemetry_relay) เมื่อมีค่าจริงเท่านั้น ไม่แสดงเลขปลอม
"use client";

import React from "react";
import { TEAM_A_HEX, TEAM_B_HEX } from "@/components/overlay/series";
import type { BuyPhasePlayer } from "@/components/overlay/BuyPhaseHud";

export function LiveRosterSidebar({ roster, side, team }: { roster: BuyPhasePlayer[]; side: "left" | "right"; team: "A" | "B" }) {
  const hex = team === "A" ? TEAM_A_HEX : TEAM_B_HEX;
  const isLeft = side === "left";

  return (
    <section className={`absolute ${isLeft ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40 w-[300px]`}>
      {roster.map((player) => (
        <div
          key={player.id}
          className={`flex items-center gap-3 bg-[#0A0A0F]/80 backdrop-blur-md border p-2 shadow-lg ${isLeft ? "rounded-r-xl" : "rounded-l-xl flex-row-reverse"}`}
          style={{ borderColor: `${hex}80` }}
        >
          <div
            className="w-12 h-12 shrink-0 bg-gray-800 rounded-md border border-white/20 flex items-center justify-center text-xs font-black"
            style={{ color: hex }}
          >
            {(player.agent || player.name).slice(0, 2).toUpperCase()}
          </div>
          <div className={`flex-1 min-w-0 ${isLeft ? "" : "text-right"}`}>
            <div className="text-xs font-bold text-white truncate">{player.name}</div>
            {player.agent && <div className="text-[9px] font-mono uppercase tracking-wider truncate" style={{ color: hex }}>{player.agent}</div>}
            {typeof player.hp === "number" && typeof player.hpMax === "number" && (
              <div className="mt-1 h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${player.hp <= 0 ? "bg-neutral-700" : player.hp / player.hpMax <= 0.3 ? "bg-rose-500" : player.hp / player.hpMax <= 0.6 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${Math.max(0, Math.min(100, (player.hp / player.hpMax) * 100))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
