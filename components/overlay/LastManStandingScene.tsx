"use client";

// components/overlay/LastManStandingScene.tsx
// ฉากเต็มจอ "VS / Last Man Standing" — โชว์ตอนทีมใดทีมหนึ่งเหลือผู้เล่นรอดคนเดียว (คลัตช์)
// เสียงประกาศ NPC ในเกม Valorant (เช่น "1v3", "Last chance") เป็นเสียงจากตัวเกมเอง ไม่มีไฟล์เสียงให้ดึงจากที่นี่ได้
// ถ้าจะเล่นเสียงเพิ่มฝั่งเรา ต้องมีไฟล์เสียง/ลิขสิทธิ์ที่พี่หยัดเตรียมมาก่อน ยังไม่ได้ทำส่วนนั้นในเวอร์ชันนี้
import React from "react";
import { TEAM_A_HEX, TEAM_B_HEX } from "@/components/overlay/series";

export interface LastManStandingPlayer {
  name: string;
  agent?: string;
}

export interface LastManStandingSceneProps {
  visible: boolean;
  /** ทีมที่เหลือคนเดียว (clutch) */
  clutchSide: "A" | "B";
  clutchPlayer: LastManStandingPlayer;
  /** จำนวนคู่ต่อสู้ที่เหลือฝั่งตรงข้าม เช่น 1v3 */
  opponentAliveCount: number;
  teamAName: string;
  teamBName: string;
}

export function LastManStandingScene({
  visible,
  clutchSide,
  clutchPlayer,
  opponentAliveCount,
  teamAName,
  teamBName,
}: LastManStandingSceneProps) {
  const hex = clutchSide === "A" ? TEAM_A_HEX : TEAM_B_HEX;
  const clutchTeamName = clutchSide === "A" ? teamAName : teamBName;

  return (
    <section
      className={`absolute inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-500 pointer-events-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="font-mono text-sm font-black uppercase tracking-[8px] text-white/60">Clutch Moment</span>
        <div
          className="px-16 py-8 rounded-2xl border-2 flex flex-col items-center gap-2 shadow-2xl"
          style={{ borderColor: hex, boxShadow: `0 0 60px ${hex}55` }}
        >
          <span className="text-6xl font-black uppercase tracking-wider" style={{ color: hex }}>
            1 V {opponentAliveCount}
          </span>
          <span className="text-3xl font-black text-white uppercase tracking-wide">{clutchPlayer.name}</span>
          {clutchPlayer.agent && <span className="text-sm font-mono text-white/60 uppercase tracking-[3px]">{clutchPlayer.agent}</span>}
          <span className="mt-2 text-xs font-mono text-white/50 uppercase tracking-[3px]">{clutchTeamName} — LAST MAN STANDING</span>
        </div>
      </div>
    </section>
  );
}
