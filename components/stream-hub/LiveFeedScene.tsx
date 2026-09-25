'use client';

// ฉาก "Live Feed" (โหมด B / C) — ภาพไลฟ์จากแหล่งภายนอกเต็มจอ + HUD ของเราแบบไม่พึ่งข้อมูลในเกม
// (ชื่อทีม / โลโก้ / สกอร์ซีรีส์จาก DB เท่านั้น — ไม่มี HP / เงิน / สกอร์รายรอบ เพราะไม่มี telemetry)
import React from 'react';
import { LiveFeedPlayer } from './LiveFeedPlayer';
import type { LiveSource } from '@/lib/stream-hub/live-source';

const TEAM_A_COLOR = '#06b6d4';
const TEAM_B_COLOR = '#f43f5e';

function TeamSide({ tag, color, align }: { tag: string; color: string; align: 'left' | 'right' }) {
  return (
    <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <div
        className="relative flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: `radial-gradient(circle, ${color}33, rgba(0,0,0,0.6) 72%)`, border: `1.5px solid ${color}aa` }}
      >
        <span className="text-lg font-black" style={{ color }}>{tag[0]}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/Team_Logo/${tag}.png`}
          alt={tag}
          className="absolute h-10 w-10 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
      <span className="text-2xl font-black uppercase tracking-wider text-white">{tag}</span>
    </div>
  );
}

export function LiveFeedScene({
  source,
  teamATag,
  teamBTag,
  winsA,
  winsB,
  bestOf,
  mapName,
}: {
  source: LiveSource;
  teamATag: string;
  teamBTag: string;
  winsA: number;
  winsB: number;
  bestOf: number;
  mapName: string;
}) {
  return (
    <div className="relative h-full w-full bg-black">
      <LiveFeedPlayer key={`${source.mode}:${source.url}`} source={source} className="absolute inset-0" />

      {/* Scorebug ด้านบน — สกอร์ซีรีส์ (จำนวนแมพ) เท่านั้น */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
        <div
          className="flex items-center gap-6 rounded-xl px-6 py-2.5"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,15,0.92), rgba(10,10,15,0.8))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          }}
        >
          <TeamSide tag={teamATag} color={TEAM_A_COLOR} align="left" />
          <div className="flex flex-col items-center leading-none">
            <div className="font-mono text-4xl font-black tabular-nums text-white">
              <span style={{ color: TEAM_A_COLOR }}>{winsA}</span>
              <span className="mx-2 text-neutral-500">-</span>
              <span style={{ color: TEAM_B_COLOR }}>{winsB}</span>
            </div>
            <div className="mt-1 font-mono text-[11px] font-bold tracking-[3px] text-[#E8B429]">
              BO{bestOf}{mapName ? ` · ${mapName}` : ''}
            </div>
          </div>
          <TeamSide tag={teamBTag} color={TEAM_B_COLOR} align="right" />
        </div>
      </div>

      {/* โลโก้มุมซ้ายล่าง */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo/logo2.png"
        alt="Zodiac League"
        className="pointer-events-none absolute bottom-4 left-4 z-10 h-20 w-auto opacity-90"
      />
    </div>
  );
}
