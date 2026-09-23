"use client";

import React from "react";
import { TEAM_A_HEX, TEAM_B_HEX } from "@/components/overlay/series";
import { SponsorCarousel } from "@/components/overlay/SponsorCarousel";

export interface LiveScoreboardTeam {
  name?: string;
  tag: string;
  logo_url: string | null;
}

export interface LiveScoreboardSeriesGame {
  gameNumber: number;
  mapName: string | null;
}

export interface LiveScoreboardProps {
  teamA: LiveScoreboardTeam;
  teamB: LiveScoreboardTeam;
  winsNeeded: number;
  winsA: number;
  winsB: number;
  roundsA: number;
  roundsB: number;
  mapLabel: string;
  mapName: string | null;
  /** ลำดับแมพทั้งซีรีส์ (จาก buildSeriesGames) ใช้โชว์ CURRENT / NEXT / DECIDER แบบ EWC — ไม่ใส่ก็โชว์แค่ CURRENT เหมือนเดิม */
  seriesGames?: LiveScoreboardSeriesGame[];
  currentGameNumber?: number;
  /** ป้ายมุมขวาบน เช่น "ZODIAC ARENA — GRAND FINAL" */
  matchLabel?: string | null;
}

function TeamLogo({ team, hex }: { team: LiveScoreboardTeam; hex: string }) {
  return (
    <div className="h-8 w-8 flex items-center justify-center bg-transparent overflow-hidden">
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo_url} alt={team.tag} className="h-full w-full object-contain filter drop-shadow-md" />
      ) : (
        <span className="font-sans text-xl font-bold text-white drop-shadow-md">
          {team.tag.slice(0, 3).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SeriesDots({ total, filled, hex }: { total: number; filled: number; hex: string }) {
  return (
    <div className="flex gap-1.5 mt-1 justify-center">
      {Array.from({ length: Math.max(1, total) }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rotate-45"
          style={i < filled ? { backgroundColor: "#fff", boxShadow: `0 0 5px ${hex}` } : { border: "1px solid rgba(255,255,255,0.3)" }}
        />
      ))}
    </div>
  );
}

// สร้างป้าย CURRENT / NEXT / DECIDER แบบที่ถ่ายทอดสดระดับ EWC ใช้ — ถ้าไม่ได้ส่ง seriesGames มา (เช่น BO1) โชว์แค่ CURRENT อย่างเดียวเหมือนเดิม
function buildMapStrip(
  seriesGames: LiveScoreboardSeriesGame[] | undefined,
  currentGameNumber: number | undefined,
  fallbackMapName: string | null
): { label: string; value: string }[] {
  if (!seriesGames || seriesGames.length <= 1 || !currentGameNumber) {
    return fallbackMapName ? [{ label: "CURRENT", value: fallbackMapName }] : [];
  }
  const strip: { label: string; value: string }[] = [];
  const current = seriesGames.find((g) => g.gameNumber === currentGameNumber);
  if (current?.mapName) strip.push({ label: "CURRENT", value: current.mapName });

  const next = seriesGames.find((g) => g.gameNumber === currentGameNumber + 1);
  const decider = seriesGames[seriesGames.length - 1];
  if (next?.mapName) {
    strip.push({ label: next.gameNumber === decider.gameNumber ? "DECIDER" : "NEXT", value: next.mapName });
  } else if (decider?.mapName && decider.gameNumber !== currentGameNumber) {
    strip.push({ label: "DECIDER", value: decider.mapName });
  }
  return strip;
}

export function LiveScoreboard({
  teamA,
  teamB,
  winsNeeded,
  winsA,
  winsB,
  roundsA,
  roundsB,
  mapLabel,
  mapName,
  seriesGames,
  currentGameNumber,
  matchLabel,
}: LiveScoreboardProps) {
  const mapStrip = buildMapStrip(seriesGames, currentGameNumber, mapName);
  const roundNumber = roundsA + roundsB + 1;

  return (
    <section className="absolute top-0 left-0 w-full flex flex-col items-center z-50 select-none">

      {/* Top Banner Bar — โปร่งใส เหลือแค่เส้นคมๆ ด้านล่างแทนกล่องทึบ (ตัวเกมจริงมีพื้นหลังของมันเองอยู่แล้ว) */}
      <div className="w-[1400px] h-[32px] flex items-center justify-between px-6 text-xs font-bold text-white/80 font-sans tracking-wide uppercase"
           style={{ borderBottom: "1px solid rgba(255,255,255,0.25)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
        <div className="flex items-center gap-6">
          {mapStrip.length > 0 ? (
            mapStrip.map((item) => (
              <span key={item.label} className="opacity-90">
                {item.label}: <span className="text-white">{item.value}</span>
              </span>
            ))
          ) : (
            <span className="opacity-90">{mapLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="opacity-90 truncate max-w-[420px]">{matchLabel || "MATCH IN PROGRESS"}</span>
          <SponsorCarousel />
        </div>
      </div>

      {/* Main Scoreboard Center Block */}
      <div className="relative -mt-[1px] flex justify-center h-[70px]">
        {/* Team A Block */}
        <div className="w-[300px] h-full bg-[#13161c] border-b-[3px] flex items-center justify-between px-6 shadow-xl"
             style={{ borderColor: TEAM_A_HEX, clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
          <TeamLogo team={teamA} hex={TEAM_A_HEX} />
          <div className="flex flex-col items-end">
            <span className="text-3xl font-black text-white leading-none">{teamA.tag}</span>
          </div>
          <div className="flex flex-col items-center justify-center w-[50px]">
            <span className="text-[40px] font-black text-white leading-none">{roundsA}</span>
            <SeriesDots total={winsNeeded} filled={winsA} hex={TEAM_A_HEX} />
          </div>
        </div>

        {/* Center Timer/Round Block */}
        <div className="w-[120px] h-[85px] -mt-2 bg-[#1a1e26] border-b-[3px] border-white/20 flex flex-col items-center justify-center relative z-10 shadow-2xl"
             style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 50%, 50% 100%, 0 50%)' }}>
          <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-2">ROUND {roundNumber}</span>
          <div className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center mt-1">
             <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        {/* Team B Block */}
        <div className="w-[300px] h-full bg-[#13161c] border-b-[3px] flex items-center justify-between px-6 shadow-xl"
             style={{ borderColor: TEAM_B_HEX, clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }}>
          <div className="flex flex-col items-center justify-center w-[50px]">
            <span className="text-[40px] font-black text-white leading-none">{roundsB}</span>
            <SeriesDots total={winsNeeded} filled={winsB} hex={TEAM_B_HEX} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-3xl font-black text-white leading-none">{teamB.tag}</span>
          </div>
          <TeamLogo team={teamB} hex={TEAM_B_HEX} />
        </div>
      </div>
    </section>
  );
}
