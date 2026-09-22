// components/overlay/BuyPhaseHud.tsx
// OBS broadcast overlay: Buy Phase HUD (เปิด/ปิดด้วย Alt+C หรือปุ่มใน Spectator Control)
// แสดงเฉพาะข้อมูลที่มีจริง: ชื่อผู้เล่น, ตัวละคร (ถ้าทราบ), K/D/A จาก match_participants
// ข้อมูลรายรอบ (เงิน, อาวุธ, เกราะ, Ult, HP) มาจาก Observer Bridge ผ่าน stream_telemetry_relay broadcast
// (ดู app/api/v1/matches/[id]/telemetry/route.ts) — ถ้ายังไม่มีค่าจะซ่อนคอลัมน์นั้น ไม่แสดงตัวเลขปลอม
"use client";

import React from "react";
import { TEAM_A_HEX, TEAM_B_HEX } from "@/components/overlay/series";

export interface BuyPhasePlayer {
  id: string;
  name: string;
  agent?: string;
  kills: number;
  deaths: number;
  assists: number;
  // telemetry รายรอบ (ไม่บังคับ)
  ultPoints?: number;
  ultMax?: number;
  armor?: "HEAVY" | "LIGHT" | "NONE";
  weapon?: string;
  credits?: number;
  minNext?: number;
  hp?: number;
  hpMax?: number;
}

function HpBar({ hp, hpMax }: { hp: number; hpMax: number }) {
  const pct = Math.max(0, Math.min(100, (hp / hpMax) * 100));
  const isDead = hp <= 0;
  const color = isDead ? "bg-neutral-700" : pct <= 30 ? "bg-rose-500" : pct <= 60 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="w-[60px] flex flex-col items-center gap-0.5">
      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono text-[9px] font-bold ${isDead ? "text-neutral-600" : "text-white/70"}`}>
        {isDead ? "DEAD" : hp}
      </span>
    </div>
  );
}

// --- WEAPON & SHIELD ICONS ---
function WeaponIcon({ name }: { name: string }) {
  const upper = name.toUpperCase();
  if (upper.includes("OPERATOR") || upper.includes("OP")) {
    return (
      <svg className="w-16 h-5 text-white/90" viewBox="0 0 100 24" fill="currentColor">
        <path d="M2 14h18l4-3h20v2h12l6-4h26l8 3v4l-4 2H60l-4-2H24l-6 3H2v-5z" opacity="0.9" />
        <rect x="42" y="5" width="22" height="3" rx="1" />
        <circle cx="53" cy="6.5" r="2.5" fill="#00D4FF" />
      </svg>
    );
  }
  if (upper.includes("PHANTOM")) {
    return (
      <svg className="w-14 h-5 text-white/90" viewBox="0 0 80 24" fill="currentColor">
        <path d="M4 14h14l4-3h24l4 3h26v4l-6 2H42l-4-2H20l-4 2H4v-6z" opacity="0.9" />
        <rect x="64" y="10" width="14" height="4" rx="1" fill="#00D4FF" />
      </svg>
    );
  }
  if (upper.includes("SHERIFF") || upper.includes("GHOST") || upper.includes("CLASSIC") || upper.includes("PISTOL")) {
    return (
      <svg className="w-8 h-5 text-white/90" viewBox="0 0 40 24" fill="currentColor">
        <path d="M6 10h22l4 3v4l-4 2H18l-3 4H9l3-4H6v-5z" opacity="0.9" />
      </svg>
    );
  }
  if (upper.includes("SPECTRE") || upper.includes("STINGER")) {
    return (
      <svg className="w-12 h-5 text-white/90" viewBox="0 0 60 24" fill="currentColor">
        <path d="M4 12h12l3-3h18l3 3h16v4l-4 2H32l-3-2H16l-3 2H4v-6z" opacity="0.9" />
        <rect x="22" y="16" width="6" height="7" rx="1" fill="#C9A84C" />
      </svg>
    );
  }
  // Default: Vandal / Assault Rifle
  return (
    <svg className="w-14 h-5 text-white/90" viewBox="0 0 80 24" fill="currentColor">
      <path d="M2 13h16l5-4h28l4 3h20v4l-5 2H46l-4-2H22l-5 3H2v-6z" opacity="0.95" />
      <path d="M34 15l-3 8h6l2-8h-5z" fill="#C9A84C" opacity="0.8" />
    </svg>
  );
}

function ShieldIcon({ type }: { type: "HEAVY" | "LIGHT" | "NONE" }) {
  if (type === "HEAVY") {
    return (
      <div className="flex items-center gap-0.5 text-white/90 font-mono text-[10px] font-bold">
        <svg className="w-4 h-4 text-[#00D4FF]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 3.99-2.55 7.7-6 8.78-3.45-1.08-6-4.79-6-8.78V6.43l6-2.25z" />
          <path d="M12 6.5l-4 1.5v3.1c0 2.7 1.7 5.2 4 5.9 2.3-.7 4-3.2 4-5.9v-3.1l-4-1.5z" />
        </svg>
        <span className="text-[9px] text-[#00D4FF]">50</span>
      </div>
    );
  }
  if (type === "LIGHT") {
    return (
      <div className="flex items-center gap-0.5 text-white/80 font-mono text-[10px] font-bold">
        <svg className="w-4 h-4 text-cyan-300/80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 3.99-2.55 7.7-6 8.78-3.45-1.08-6-4.79-6-8.78V6.43l6-2.25z" />
        </svg>
        <span className="text-[9px] text-cyan-300">25</span>
      </div>
    );
  }
  return <div className="w-4 h-4 opacity-10" />;
}

function UltDots({ current, max }: { current: number; max: number }) {
  const isReady = current >= max;
  return (
    <div className="flex items-center gap-1">
      {isReady ? (
        <span className="px-1.5 py-0.2 bg-[#00D4FF]/20 border border-[#00D4FF]/80 text-[#00D4FF] rounded text-[9px] font-mono font-black animate-pulse">
          READY
        </span>
      ) : (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: max }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < current
                  ? "bg-[#00D4FF] shadow-[0_0_4px_#00D4FF]"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface HudTeam {
  name: string;
  tag: string;
}

const initials = (p: BuyPhasePlayer) => (p.agent || p.name).slice(0, 2).toUpperCase();

function TeamCard({ team, roster, hex, mirrored }: { team: HudTeam; roster: BuyPhasePlayer[]; hex: string; mirrored: boolean }) {
  const withCredits = roster.filter((p) => typeof p.credits === "number");
  const bank = withCredits.reduce((sum, p) => sum + (p.credits ?? 0), 0);
  const minNext = withCredits.reduce((sum, p) => sum + (p.minNext ?? 0), 0);

  return (
    <div className="relative bg-[#0b0f19]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
      {/* HEADER */}
      <div className={`flex justify-between items-center border-b border-white/10 pb-3 mb-3 ${mirrored ? "flex-row-reverse" : ""}`}>
        <div className={mirrored ? "text-right" : ""}>
          <h2 className="text-2xl font-black text-white tracking-wide uppercase font-sans">{team.name}</h2>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: hex }}>
            [{team.tag}]
          </span>
        </div>
        {withCredits.length > 0 && (
          <div className={`font-mono ${mirrored ? "text-left" : "text-right"}`}>
            <div className={`text-emerald-400 font-black text-sm flex items-center gap-1 ${mirrored ? "justify-start" : "justify-end"}`}>
              <span className="text-[10px] opacity-70">BANK</span>
              <span className="text-base tracking-tight">¤ {bank.toLocaleString()}</span>
            </div>
            <div className={`text-gray-400 font-bold text-[10px] flex items-center gap-1 ${mirrored ? "justify-start" : "justify-end"}`}>
              <span className="opacity-70">MIN NEXT:</span>
              <span>¤ {minNext.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* PLAYER ROWS */}
      <div className="space-y-2">
        {roster.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between gap-4 bg-white/[0.03] px-3 py-2 rounded-xl border border-white/5 ${mirrored ? "flex-row-reverse" : ""}`}
          >
            <div className={`flex items-center gap-3 flex-1 min-w-0 ${mirrored ? "flex-row-reverse text-right" : ""}`}>
              <div
                className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#1c2237] to-[#121624] border border-white/20 flex items-center justify-center font-mono text-xs font-black"
                style={{ color: hex }}
              >
                {initials(player)}
              </div>
              <div className="min-w-0">
                {player.agent && (
                  <span className="font-mono text-[9px] block font-bold uppercase tracking-wider" style={{ color: hex }}>
                    {player.agent}
                  </span>
                )}
                <span className="font-bold text-xs text-white truncate block">{player.name}</span>
              </div>
            </div>

            <div className="w-[85px] text-center font-mono text-xs text-gray-300 font-bold">
              <span>{player.kills}</span>
              <span className="text-gray-600 px-1">/</span>
              <span>{player.deaths}</span>
              <span className="text-gray-600 px-1">/</span>
              <span>{player.assists}</span>
            </div>

            {typeof player.hp === "number" && typeof player.hpMax === "number" && (
              <HpBar hp={player.hp} hpMax={player.hpMax} />
            )}
            {typeof player.ultMax === "number" && (
              <div className="w-[85px] flex justify-center">
                <UltDots current={player.ultPoints ?? 0} max={player.ultMax} />
              </div>
            )}
            {player.armor && (
              <div className="w-[50px] flex justify-center">
                <ShieldIcon type={player.armor} />
              </div>
            )}
            {player.weapon && (
              <div className="w-[120px] flex justify-center">
                <WeaponIcon name={player.weapon} />
              </div>
            )}
            {typeof player.credits === "number" && (
              <div className={`w-[100px] font-mono ${mirrored ? "text-left" : "text-right"}`}>
                <span className="text-emerald-400 font-bold text-xs block">¤ {player.credits.toLocaleString()}</span>
                {typeof player.minNext === "number" && (
                  <span className="text-gray-500 text-[9px] block">¤ {player.minNext.toLocaleString()}</span>
                )}
              </div>
            )}
          </div>
        ))}
        {roster.length === 0 && <p className="py-4 text-center font-mono text-[11px] text-neutral-500">NO ROSTER DATA</p>}
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
}: {
  visible: boolean;
  teamA: HudTeam | undefined;
  teamB: HudTeam | undefined;
  rosterA: BuyPhasePlayer[];
  rosterB: BuyPhasePlayer[];
}) {
  return (
    <section
      className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[1760px] z-50 transition-all duration-300 transform pointer-events-none ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
      }`}
    >
      <div className="grid grid-cols-2 gap-8">
        <TeamCard team={teamA ?? { name: "TEAM A", tag: "A" }} roster={rosterA} hex={TEAM_A_HEX} mirrored={false} />
        <TeamCard team={teamB ?? { name: "TEAM B", tag: "B" }} roster={rosterB} hex={TEAM_B_HEX} mirrored />
      </div>
    </section>
  );
}
