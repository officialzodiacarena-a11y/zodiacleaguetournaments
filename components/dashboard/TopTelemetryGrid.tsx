// components/dashboard/TopTelemetryGrid.tsx
'use client';

import React from 'react';
import { WeaponPerformance, MapMastery } from '@/types/dashboard';

interface Props {
  weapons: WeaponPerformance[];
  maps: MapMastery[];
}

export const TopTelemetryGrid: React.FC<Props> = ({ weapons, maps }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
      {/* 🔫 Top Weapons Matrix (7 Cols) */}
      <div className="lg:col-span-7 rounded-2xl bg-[#0F111E]/85 backdrop-blur-2xl border border-white/5 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent" />
        <h3 className="text-xs font-bold tracking-widest text-white uppercase font-mono mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          Top Weapons &amp; Accuracy
        </h3>

        <div className="space-y-4">
          {weapons.map((w, idx) => (
            <div key={idx} className="bg-[#080811]/70 border border-white/5 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white font-mono block">{w.weaponName}</span>
                <span className="text-[11px] text-slate-400 font-mono">{w.category} • {w.kills} Kills</span>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs font-bold text-amber-400">Head: {w.headPct}%</div>
                <div className="w-32 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden flex">
                  <div className="bg-amber-400 h-full" style={{ width: `${w.headPct}%` }} />
                  <div className="bg-cyan-500 h-full" style={{ width: `${w.bodyPct}%` }} />
                  <div className="bg-purple-500 h-full" style={{ width: `${w.legPct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🗺️ Top Maps Mastery (5 Cols) */}
      <div className="lg:col-span-5 rounded-2xl bg-[#0F111E]/85 backdrop-blur-2xl border border-white/5 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#10B981] to-transparent" />
        <h3 className="text-xs font-bold tracking-widest text-white uppercase font-mono mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          Map Performance Mastery
        </h3>

        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {maps.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
                m.isWeakest
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                  : 'bg-[#080811]/70 border-white/5 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">{m.mapName}</span>
                {m.isWeakest && <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-400">WEAK</span>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-400">{m.record}</span>
                <span className={`font-bold ${m.winRatePct >= 70 ? 'text-[#10B981]' : m.winRatePct >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {m.winRatePct}% WR
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};