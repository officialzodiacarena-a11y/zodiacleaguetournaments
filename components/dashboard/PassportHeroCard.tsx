'use client';

import React from 'react';
import { AthleteProfile, CoreKpiMetrics } from '@/types/dashboard';

interface Props {
  profile: AthleteProfile;
  kpi: CoreKpiMetrics;
}

export const PassportHeroCard: React.FC<Props> = ({ profile, kpi }) => {
  return (
    <section className="relative w-full rounded-[18px] bg-[#0F111E]/90 border border-white/[0.08] p-5 lg:p-6 shadow-2xl backdrop-blur-2xl overflow-hidden border-t-2 border-t-[#F59E0B]">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Left: Constellation Badge + Player Info */}
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#161226] to-[#251b3d] border border-[#8B5CF6]/40 flex items-center justify-center shadow-lg shadow-[#8B5CF6]/10">
              <svg viewBox="0 0 100 100" className="w-12 h-12 text-[#8B5CF6] stroke-current fill-none">
                <circle cx="28" cy="62" r="3" fill="#F59E0B" />
                <circle cx="48" cy="58" r="2.5" fill="#8B5CF6" />
                <circle cx="68" cy="45" r="3.5" fill="#06B6D4" />
                <circle cx="58" cy="30" r="2.5" fill="#8B5CF6" />
                <circle cx="38" cy="35" r="3" fill="#F59E0B" />
                <circle cx="22" cy="42" r="2.5" fill="#FFF" />
                <polyline points="28,62 48,58 68,45 58,30 38,35 22,42" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="absolute -bottom-1 -right-1 bg-[#8B5CF6] text-white text-[9px] font-orbitron font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {profile.zodiacSign} ♌
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-orbitron font-bold tracking-wider text-[#8B5CF6] uppercase">
                {profile.divisionTier} DIVISION • TIER III
              </span>
              {profile.isVerified && (
                <span className="inline-flex items-center gap-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                  ✓ VERIFIED
                </span>
              )}
            </div>
            
            <h1 className="text-3xl font-black font-orbitron text-white tracking-wide mt-1">
              {profile.displayName}<span className="text-slate-500 font-normal text-xl">#{profile.riotId.split('#')[1] || 'TH1'}</span>
            </h1>
            
            <p className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-2">
              <span>TEAM: <strong className="text-slate-200">{profile.teamName}</strong></span>
              <span className="text-slate-600">•</span>
              <span>ROLE: <strong className="text-slate-200">{profile.role}</strong></span>
            </p>
          </div>
        </div>

        {/* Right: Metrics + Dual Tokens (ปรับความสูงยึดเท่ากันเป๊ะ 74px) */}
        <div className="w-full lg:w-auto flex flex-wrap items-stretch gap-3">
          
          {/* ACS */}
          <div className="bg-[#080811]/90 border border-white/[0.08] rounded-xl px-4 py-2 min-w-[95px] min-h-[74px] flex flex-col justify-between text-center">
            <span className="text-[10px] font-orbitron font-bold text-slate-400 block tracking-wider uppercase">ACS</span>
            <span className="text-2xl font-black font-rajdhani text-[#06B6D4] leading-none">{kpi.acs}</span>
            <span className="text-[9px] text-slate-500 font-mono block">Top 4%</span>
          </div>

          {/* KDA */}
          <div className="bg-[#080811]/90 border border-white/[0.08] rounded-xl px-4 py-2 min-w-[95px] min-h-[74px] flex flex-col justify-between text-center">
            <span className="text-[10px] font-orbitron font-bold text-slate-400 block tracking-wider uppercase">KDA</span>
            <span className="text-2xl font-black font-rajdhani text-[#F59E0B] leading-none">{kpi.kdRatio}</span>
            <span className="text-[9px] text-slate-500 font-mono block">420/290/95</span>
          </div>

          {/* WIN RATE */}
          <div className="bg-[#080811]/90 border border-white/[0.08] rounded-xl px-4 py-2 min-w-[95px] min-h-[74px] flex flex-col justify-between text-center">
            <span className="text-[10px] font-orbitron font-bold text-slate-400 block tracking-wider uppercase">WIN RATE</span>
            <span className="text-2xl font-black font-rajdhani text-[#10B981] leading-none">{kpi.winRatePct}%</span>
            <span className="text-[9px] text-slate-500 font-mono block">{kpi.recentRecord}</span>
          </div>

          {/* Dual Tokens Box */}
          <div className="flex items-center gap-2 bg-[#15182A]/90 border border-[#F59E0B]/30 rounded-xl p-2 px-3 shadow-inner min-h-[74px]">
            <div className="flex items-center gap-2.5 pr-3 border-r border-white/[0.08]">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B] text-sm">
                💎
              </div>
              <div className="text-left">
                <span className="text-[9px] font-orbitron font-bold text-slate-400 block">ZP POINTS</span>
                <span className="text-lg font-black font-rajdhani text-[#F59E0B] leading-tight">
                  {profile.zpBalance.toLocaleString()} <span className="text-xs">ZP</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pl-2">
              <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/40 flex items-center justify-center text-[#06B6D4] text-sm">
                🪙
              </div>
              <div className="text-left">
                <span className="text-[9px] font-orbitron font-bold text-slate-400 block">AP TOKENS</span>
                <span className="text-lg font-black font-rajdhani text-[#06B6D4] leading-tight">
                  {profile.apBalance.toLocaleString()} <span className="text-xs">AP</span>
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};