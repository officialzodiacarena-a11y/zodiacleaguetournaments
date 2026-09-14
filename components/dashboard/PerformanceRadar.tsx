'use client';

import React from 'react';
import { RadarPerformanceData } from '@/types/dashboard';

interface Props {
  data: RadarPerformanceData;
  leagueAvg?: RadarPerformanceData;
}

export const PerformanceRadar: React.FC<Props> = ({
  data,
  leagueAvg = { aim: 65, acs: 70, firstKills: 60, clutchPct: 55, utility: 68 },
}) => {
  const cx = 200;
  const cy = 180;
  const r = 115;

  const angles = [-90, -18, 54, 126, 198];

  const getCoordinates = (value: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const distance = (value / 100) * r;
    return {
      x: cx + distance * Math.cos(rad),
      y: cy + distance * Math.sin(rad),
    };
  };

  const currentCoords = [
    getCoordinates(data.aim, angles[0]),
    getCoordinates(data.acs, angles[1]),
    getCoordinates(data.firstKills, angles[2]),
    getCoordinates(data.clutchPct, angles[3]),
    getCoordinates(data.utility, angles[4]),
  ];

  const avgCoords = [
    getCoordinates(leagueAvg.aim, angles[0]),
    getCoordinates(leagueAvg.acs, angles[1]),
    getCoordinates(leagueAvg.firstKills, angles[2]),
    getCoordinates(leagueAvg.clutchPct, angles[3]),
    getCoordinates(leagueAvg.utility, angles[4]),
  ];

  const currentPointsStr = currentCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const avgPointsStr = avgCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <div className="relative w-full rounded-[18px] bg-[#0A0D18]/70 backdrop-blur-2xl border border-cyan-500/20 p-5 lg:p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden">
      
      {/* HUD Corner Brackets */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00F5FF]/60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00F5FF]/60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00F5FF]/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00F5FF]/30 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-2 z-10">
        <div>
          <h2 className="text-xs font-orbitron font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F5FF] shadow-[0_0_8px_#00F5FF] animate-pulse" />
            PERFORMANCE ANALYTICS (5-AXIS RADAR)
          </h2>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Tactical telemetry benchmark vs Celestial Division average</p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-[#00F5FF] font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F5FF] shadow-[0_0_8px_#00F5FF]" /> Current
          </span>
          <span className="flex items-center gap-1.5 text-[#C084FC]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C084FC] shadow-[0_0_8px_#C084FC]" /> League Avg
          </span>
        </div>
      </div>

      {/* SVG Radar */}
      <div className="relative w-full max-w-[480px] mx-auto py-2 flex items-center justify-center">
        <svg viewBox="0 0 400 360" className="w-full h-auto overflow-visible">
          <defs>
            <filter id="hologram-cyan-bloom" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur1" />
              <feGaussianBlur stdDeviation="2" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="hologram-purple-bloom" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="holoCoreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.18" />
              <stop offset="45%" stopColor="#8B5CF6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#080811" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cyanGlassPoly" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.32" />
              <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="purpleGlassPoly" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <circle cx={cx} cy={cy} r={r + 30} fill="url(#holoCoreGlow)" />

          {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => {
            const points = angles
              .map((a) => {
                const rad = (a * Math.PI) / 180;
                return `${(cx + r * scale * Math.cos(rad)).toFixed(1)},${(cy + r * scale * Math.sin(rad)).toFixed(1)}`;
              })
              .join(' ');
            return (
              <polygon
                key={i}
                points={points}
                fill={i === 4 ? 'rgba(10, 13, 24, 0.45)' : 'none'}
                stroke={i === 4 ? 'rgba(0, 245, 255, 0.35)' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={i === 4 ? '1.5' : '1'}
                strokeDasharray={i % 2 === 1 ? '3 3' : 'none'}
              />
            );
          })}

          {angles.map((a, i) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={(cx + r * Math.cos(rad)).toFixed(1)}
                y2={(cy + r * Math.sin(rad)).toFixed(1)}
                stroke="rgba(0, 245, 255, 0.2)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            );
          })}

          <polygon
            points={avgPointsStr}
            fill="url(#purpleGlassPoly)"
            stroke="#C084FC"
            strokeWidth="1.8"
            filter="url(#hologram-purple-bloom)"
          />

          <polygon
            points={currentPointsStr}
            fill="url(#cyanGlassPoly)"
            stroke="#00F5FF"
            strokeWidth="2.8"
            filter="url(#hologram-cyan-bloom)"
          />

          {avgCoords.map((c, i) => (
            <circle
              key={`avg-${i}`}
              cx={c.x}
              cy={c.y}
              r="3"
              fill="#C084FC"
              stroke="#1E1B4B"
              strokeWidth="1.5"
            />
          ))}

          {currentCoords.map((c, i) => (
            <g key={`cur-${i}`}>
              <circle cx={c.x} cy={c.y} r="6" fill="none" stroke="#00F5FF" strokeWidth="1" opacity="0.6" />
              <circle cx={c.x} cy={c.y} r="3.5" fill="#FFFFFF" stroke="#00F5FF" strokeWidth="2" />
            </g>
          ))}

          <text x="200" y="32" textAnchor="middle" fill="#FFFFFF" className="font-orbitron text-xs font-black tracking-wider">AIM ({data.aim}% HS)</text>
          <text x="345" y="142" textAnchor="start" fill="#FFFFFF" className="font-orbitron text-xs font-black tracking-wider">ACS ({data.acs})</text>
          <text x="295" y="315" textAnchor="start" fill="#FFFFFF" className="font-orbitron text-xs font-black tracking-wider">FIRST KILLS</text>
          <text x="105" y="315" textAnchor="end" fill="#FFFFFF" className="font-orbitron text-xs font-black tracking-wider">CLUTCH %</text>
          <text x="55" y="142" textAnchor="end" fill="#FFFFFF" className="font-orbitron text-xs font-black tracking-wider">UTILITY USAGE</text>
        </svg>
      </div>

      {/* 3 กล่องสรุปล่าง */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.08] text-center z-10">
        <div className="bg-[#080811]/70 p-2.5 rounded-xl border border-white/[0.08] shadow-inner">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Highest Attribute</span>
          <span className="text-xs font-bold text-[#00F5FF] font-orbitron mt-0.5 block">AIM PRECISION (92)</span>
        </div>
        <div className="bg-[#080811]/70 p-2.5 rounded-xl border border-white/[0.08] shadow-inner">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Recent Form</span>
          <span className="text-xs font-bold text-[#10B981] font-orbitron mt-0.5 block">+12.4% vs SPLIT 1</span>
        </div>
        <div className="bg-[#080811]/70 p-2.5 rounded-xl border border-white/[0.08] shadow-inner">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Playstyle Profile</span>
          <span className="text-xs font-bold text-[#F59E0B] font-orbitron mt-0.5 block">LETHAL OPENER</span>
        </div>
      </div>
    </div>
  );
};