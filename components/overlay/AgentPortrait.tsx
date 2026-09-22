// components/overlay/AgentPortrait.tsx
// ภาพครึ่งตัว Agent จริง (Riot public asset CDN) จับคู่ด้วยชื่อ agent_played จริงจาก match_participants
// ถ้าไม่รู้จัก Agent หรือภาพโหลดไม่ขึ้น กลับไปแสดงอักษรย่อของชื่อ/ตัวละครแทน (ไม่เดา ไม่ใช้ภาพ placeholder ปลอม)
"use client";

import React, { useState } from "react";
import { getAgentVisual, roleInitial } from "@/lib/overlay/agents";

export function AgentPortrait({
  agent,
  fallbackText,
  hex,
  size = "md",
  showRoleBadge = true,
}: {
  agent?: string;
  fallbackText: string;
  hex: string;
  size?: "sm" | "md";
  showRoleBadge?: boolean;
}) {
  const visual = getAgentVisual(agent);
  const [imgFailed, setImgFailed] = useState(false);
  const dims = size === "sm" ? "h-12 w-12 rounded-md" : "h-14 w-11 rounded-lg";

  if (!visual || imgFailed) {
    return (
      <div
        className={`relative ${dims} shrink-0 overflow-hidden bg-gradient-to-br from-[#1c2237] to-[#121624] border border-white/20 flex items-center justify-center font-mono text-xs font-black`}
        style={{ color: hex }}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <div
      className={`relative ${dims} shrink-0 overflow-hidden border border-white/20 flex items-end justify-center`}
      style={{ background: `linear-gradient(160deg, ${visual.accent}55, #0b0f19)` }}
    >
      <img src={visual.portrait} alt={visual.name} className="h-full w-full object-cover object-top" onError={() => setImgFailed(true)} />
      {showRoleBadge && (
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/70 border flex items-center justify-center text-[8px] font-mono font-black"
          style={{ borderColor: hex, color: hex }}
        >
          {roleInitial(visual.role)}
        </span>
      )}
    </div>
  );
}
