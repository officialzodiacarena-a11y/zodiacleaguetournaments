'use client';

import React, { useState, useEffect } from 'react';
import {
  Star, Crosshair, Shield, Swords, Navigation, ShieldCheck,
  Cloud
} from 'lucide-react';
import { TelemetryHudCompositePayload } from '@/types/athlete-telemetry-hud';

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  DUELIST: Swords,
  INITIATOR: Navigation,
  SENTINEL: ShieldCheck,
  CONTROLLER: Cloud,
};

const ROLE_RING_COLORS: Record<string, string> = {
  DUELIST: '#EF4444',
  INITIATOR: '#00D4FF',
  SENTINEL: '#9184D9',
  CONTROLLER: '#10B981',
};

function fmt(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? 'N/A' : value.toFixed(digits);
}

export default function AthleteTelemetryHUD({ playerId }: { playerId?: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'roles-weapons' | 'matches'>('overview');
  const [hudData, setHudData] = useState<TelemetryHudCompositePayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTelemetryData() {
      try {
        setIsLoading(true);
        setError(null);
        const url = playerId
          ? `/api/v1/players/me/telemetry-hud?playerId=${encodeURIComponent(playerId)}`
          : '/api/v1/players/me/telemetry-hud';
        const response = await fetch(url);
        const result = await response.json();
        if (result.success && result.data) {
          setHudData(result.data);
        } else {
          setError(result.error || 'Failed to fetch telemetry data');
        }
      } catch (err) {
        console.error('Failed to load telemetry HUD data', err);
        setError('Network error: Failed to fetch telemetry data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTelemetryData();
  }, [playerId]);

  if (isLoading) {
    return (
      <div className="w-full min-h-[600px] bg-[#0D0E1A] text-white flex items-center justify-center font-mono rounded-2xl">
        <div className="flex items-center gap-3 bg-[#121424] border border-[#E8B429]/30 px-6 py-4 rounded-2xl shadow-2xl">
          <div className="w-4 h-4 border-2 border-[#E8B429] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-[#E8B429] font-bold tracking-wider">LOADING ATHLETE TELEMETRY HUD...</span>
        </div>
      </div>
    );
  }

  if (error || !hudData) {
    return (
      <div className="w-full min-h-[600px] bg-[#0D0E1A] text-white flex flex-col items-center justify-center font-mono rounded-2xl">
        <div className="flex flex-col items-center gap-3 bg-[#121424] border border-red-500/30 px-6 py-6 rounded-2xl shadow-2xl text-center">
          <Shield className="w-8 h-8 text-red-500 mb-2" />
          <span className="text-sm text-red-400 font-bold tracking-wider">TELEMETRY UNAVAILABLE</span>
          <span className="text-xs text-neutral-500">{error || 'No data found for this athlete.'}</span>
        </div>
      </div>
    );
  }

  const { overview, accuracyAnatomy, rolesBreakdown, topWeapons, rolling20Tiles, recent20Matches } = hudData;

  const getRoleIcon = (roleKey: string) => {
    const Icon = ROLE_ICONS[roleKey.toUpperCase()] || Shield;
    return <Icon className="w-4 h-4" />;
  };

  const getRoleColor = (roleKey: string) => {
    return ROLE_RING_COLORS[roleKey.toUpperCase()] || '#64748B';
  };

  return (
    <div className="w-full bg-[#0D0E1A] text-[#E9E9ED] font-sans pb-16 custom-scrollbar relative">
      
      {/* TOP STATUS SCANLINE */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[#E8B429]/50 to-transparent w-full"></div>

      {/* NAVBAR */}
      <nav className="h-16 border-b border-[#E8B429]/15 bg-[#0D0E1A]/95 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8B429]/10 border border-[#E8B429]/40 flex items-center justify-center text-[#E8B429]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-mono text-sm font-black tracking-widest text-[#E8B429]">ZODIAC ARENA</div>
            <div className="text-[9px] font-mono text-neutral-500 tracking-wider">ATHLETE TELEMETRY HUD // VALORANT RADIANT</div>
          </div>
        </div>

        {/* Interactive Navigation Tabs */}
        <div className="hidden md:flex items-center gap-6 text-xs font-mono font-bold tracking-wider text-neutral-400">
          <button onClick={() => setActiveTab('overview')} className={`pb-1 transition-colors ${activeTab === 'overview' ? 'text-[#E8B429] border-b-2 border-[#E8B429]' : 'hover:text-white'}`}>OVERVIEW</button>
          <button onClick={() => setActiveTab('roles-weapons')} className={`pb-1 transition-colors ${activeTab === 'roles-weapons' ? 'text-[#E8B429] border-b-2 border-[#E8B429]' : 'hover:text-white'}`}>ROLES & TOP WEAPONS</button>
          <button onClick={() => setActiveTab('matches')} className={`pb-1 transition-colors ${activeTab === 'matches' ? 'text-[#E8B429] border-b-2 border-[#E8B429]' : 'hover:text-white'}`}>MATCH TIMELINE ({overview.rolling20Record})</button>
        </div>

        {/* Quick Status */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-2 bg-[#121424] border border-white/10 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-neutral-400">AP-BANGKOK</span>
          </div>
          {overview.isSelf && overview.apBalance !== null && (
            <div className="flex items-center gap-1.5 bg-[#E8B429]/10 border border-[#E8B429]/30 px-3 py-1.5 rounded-lg text-[#E8B429] font-bold">
              <span>{overview.apBalance} AP</span>
            </div>
          )}
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 space-y-6">

        {/* 1. HERO PASSPORT STRIP */}
        <section className="relative overflow-hidden rounded-2xl bg-[#121424] border border-[#E8B429]/20 p-6 shadow-xl">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 bg-[radial-gradient(#E8B429_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#1E2035] to-[#2B2741] border-2 border-[#E8B429] flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(232,180,41,0.25)] overflow-hidden">
                  {overview.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={overview.avatarUrl} alt={overview.displayName} className="w-full h-full object-cover" />
                  ) : (
                    '⚡'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-black/80 border border-[#E8B429]/50 rounded-md px-1.5 py-0.5 text-[9px] font-mono text-[#E8B429]">
                  {overview.athleteId || 'LVL --'}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-mono font-black text-white tracking-wider">{overview.displayName}</h1>
                  {overview.gameName && (
                    <span className="text-neutral-400 text-xs font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded">#{overview.tagLine}</span>
                  )}
                  {overview.isVerified && (
                    <span className="inline-flex items-center gap-1 bg-[#E8B429]/15 border border-[#E8B429]/40 text-[#E8B429] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-[#E8B429]" /> VERIFIED
                    </span>
                  )}
                </div>

                <div className="text-xs text-neutral-400 mt-1 font-mono">
                  ZODIAC ARENA ATHLETE · <span className="text-neutral-500">{overview.metrics.wins! + overview.metrics.losses!} Matches</span>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap text-[11px] font-mono font-bold">
                  {rolesBreakdown.length > 0 && (
                    <span className="bg-[#9184d9]/15 border border-[#9184d9]/40 text-[#9184d9] px-2.5 py-0.5 rounded">
                      ⚔ PRIMARY: {rolesBreakdown[0].roleName.toUpperCase()} ({rolesBreakdown[0].winRatePct}% WR)
                    </span>
                  )}
                  <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-2.5 py-0.5 rounded">
                    ★ {overview.metrics.wins} W / {overview.metrics.losses} L ({fmt(overview.metrics.winRatePct, 1)}% WR)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-8 w-full lg:w-auto justify-between lg:justify-end">
              <div>
                <div className="text-[10px] font-mono uppercase text-neutral-400">Current Rating</div>
                <div className="text-2xl md:text-3xl font-black font-mono text-[#E8B429] drop-shadow-[0_0_12px_rgba(232,180,41,0.3)]">
                  {overview.currentRankTier || 'UNRANKED'} <span className="text-xs font-normal text-neutral-400">{overview.currentRankRr || 0} RR</span>
                </div>
                <div className="text-[10px] font-mono text-cyan-400">Global Leaderboard</div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-neutral-400">Peak Rating</div>
                <div className="text-lg md:text-xl font-bold font-mono text-white">
                  {overview.peakRr || '--'} <span className="text-xs font-normal text-neutral-400">RR</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-500">{overview.peakSeason || 'Unknown'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. TELEMETRY KPI TILES */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center hover:border-[#E8B429]/40 transition-all">
            <div className="text-2xl font-black font-mono text-[#E8B429]">{fmt(overview.metrics.acs, 1)}</div>
            <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase mt-1">ACS</div>
          </div>
          <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center hover:border-[#E8B429]/40 transition-all">
            <div className="text-2xl font-black font-mono text-white">{fmt(overview.metrics.kdRatio, 2)}</div>
            <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase mt-1">K/D Ratio</div>
            <div className="text-[9px] text-green-400 mt-0.5">KAD {fmt(overview.metrics.kdaRatio, 2)}</div>
          </div>
          <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center hover:border-[#E8B429]/40 transition-all">
            <div className="text-2xl font-black font-mono text-white">{fmt(overview.metrics.adr, 1)}</div>
            <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase mt-1">ADR</div>
          </div>
          <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center hover:border-[#E8B429]/40 transition-all">
            <div className="text-2xl font-black font-mono text-cyan-400">--</div>
            <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase mt-1">KAST %</div>
          </div>
          <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center hover:border-[#E8B429]/40 transition-all">
            <div className="text-2xl font-black font-mono text-white">{fmt(overview.metrics.headshotPct, 1)}%</div>
            <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase mt-1">Headshot %</div>
          </div>
          <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center hover:border-[#E8B429]/40 transition-all">
            <div className="text-2xl font-black font-mono text-green-400">{fmt(overview.metrics.winRatePct, 1)}%</div>
            <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase mt-1">Win %</div>
            <div className="text-[9px] text-neutral-400 mt-0.5">{overview.metrics.wins}W - {overview.metrics.losses}L</div>
          </div>
        </section>

        {/* 3. TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT SIDE: Accuracy Anatomy + Roles + Top Weapons */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* ACCURACY BODY HIT ANATOMY & ROLLING CURVE */}
              <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4 font-mono">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <span>ACCURACY</span>
                  </h3>
                  <span className="text-[10px] text-neutral-500">Last 20 Matches</span>
                </div>

                <div className="flex items-center gap-4 bg-[#1A1C2E] p-3 rounded-xl border border-white/5">
                  <div className="shrink-0">
                    <svg width="48" height="96" viewBox="0 0 48 96" fill="none" className="drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]">
                      <circle cx="24" cy="12" r="7" fill="#00D4FF" />
                      <path d="M15 22 C13 22 10 26 8 38 C7 44 9 46 11 46 C13 46 14 42 15 35 L16 52 L32 52 L33 35 C34 42 35 46 37 46 C39 46 41 44 40 38 C38 26 35 22 33 22 Z" fill="#00D4FF" />
                      <path d="M17 55 L16 90 C16 93 21 93 21 90 L23 62 L25 62 L27 90 C27 93 32 93 32 90 L31 55 Z" fill="#64748B" />
                    </svg>
                  </div>
                  <div className="flex-1 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Head</span>
                      <span className="font-bold text-cyan-400">{accuracyAnatomy?.headPct || 0}%</span>
                      <span className="text-[11px] text-neutral-400">{accuracyAnatomy?.headHits || 0} Hits</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Body</span>
                      <span className="font-bold text-cyan-400">{accuracyAnatomy?.bodyPct || 0}%</span>
                      <span className="text-[11px] text-neutral-400">{accuracyAnatomy?.bodyHits || 0} Hits</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Legs</span>
                      <span className="font-bold text-neutral-400">{accuracyAnatomy?.legPct || 0}%</span>
                      <span className="text-[11px] text-neutral-500">{accuracyAnatomy?.legHits || 0} Hits</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1 flex justify-between">
                    <span>AVG HS% Curve</span>
                    <span className="text-cyan-400">Ref: {fmt(overview.metrics.headshotPct, 1)}% HS</span>
                  </div>
                  
                  <div className="relative bg-[#1A1C2E] p-2 rounded-xl border border-white/5">
                    <svg width="100%" height="56" viewBox="0 0 200 56" className="overflow-visible">
                      <defs>
                        <linearGradient id="hsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="10" x2="200" y2="10" stroke="rgba(255,255,255,0.05)" strokeDasharray="2" />
                      <line x1="0" y1="30" x2="200" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="2" />
                      <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="2" />
                      <path d="M0,38 Q20,38 35,46 T70,30 T105,48 T120,24 T140,45 T175,34 T200,42 L200,56 L0,56 Z" fill="url(#hsGrad)" />
                      <path d="M0,38 Q20,38 35,46 T70,30 T105,48 T120,24 T140,45 T175,34 T200,42" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                      <line x1="115" y1="0" x2="115" y2="56" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                      <circle cx="115" cy="35" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                    </svg>
                    <div className="flex justify-between text-[9px] text-neutral-500 mt-1">
                      <span>Match -20</span>
                      <span>Match -10</span>
                      <span>Latest</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROLES BREAKDOWN */}
              <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>ROLES BREAKDOWN</span>
                </h3>

                {rolesBreakdown.map(role => (
                  <div key={role.roleKey} className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A1C2E] border border-white/5 font-mono">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full p-[2px] flex items-center justify-center" style={{ background: `conic-gradient(${getRoleColor(role.roleKey)} ${role.winRatePct}%, rgba(255,255,255,0.08) 0deg)` }}>
                        <div className="w-full h-full rounded-full bg-[#121424] flex items-center justify-center text-white">
                           {getRoleIcon(role.roleKey)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{role.roleName}</div>
                        <div className="text-[11px] font-bold text-green-400">WR {role.winRatePct}%</div>
                        <div className="text-[9px] text-neutral-500">{role.wins}W - {role.losses}L</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">KDA {role.kdaRatio}</div>
                      <div className="text-[9px] text-neutral-400">{role.kills}K / {role.deaths} / {role.assists}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TOP WEAPONS */}
              <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4 font-mono">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-[#E8B429]" />
                  <span>TOP WEAPONS</span>
                </h3>

                {topWeapons.map(weapon => (
                  <div key={weapon.weaponName} className="p-3 rounded-xl bg-[#1A1C2E] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{weapon.weaponName}</div>
                        <div className="text-[10px] text-neutral-500">{weapon.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-neutral-400">Kills</div>
                        <div className="font-black text-white text-base">{weapon.kills.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-[#E8B429] font-bold">Head: {weapon.headPct}%</span>
                      <span className="text-neutral-300">Body: {weapon.bodyPct}%</span>
                      <span className="text-neutral-500">Leg: {weapon.legPct}%</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* RIGHT SIDE: 16W - 4L Rolling Banner & Matches */}
            <div className="lg:col-span-8 space-y-6">
              
              <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/40 text-green-400 px-3 py-1 rounded-lg font-bold text-xs">
                      <span>{overview.rolling20Record} ({overview.rolling20WinRatePct}% Win Rate)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-10 gap-2">
                  {rolling20Tiles.map((tile, idx) => (
                    <div key={tile.matchId || idx} className={`border rounded-lg p-2 text-center ${tile.isWin ? 'bg-green-500/15 border-green-500/40' : 'bg-red-500/15 border-red-500/40'}`}>
                      <div className="text-[9px] text-neutral-400">{tile.timeAgo}</div>
                      <div className={`text-xs font-black ${tile.isWin ? 'text-green-400' : 'text-red-400'}`}>{tile.scoreSummary}</div>
                      <div className="text-[9px] text-neutral-300">K/D {tile.kdRatio}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DETAILED MATCH ROWS */}
              <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">Recent Matches</span>
                    <span className="bg-white/5 text-neutral-300 text-[10px] px-2 py-0.5 rounded font-bold">{recent20Matches.length} Matches</span>
                  </div>
                </div>

                {recent20Matches.map((match, idx) => (
                  <div key={match.matchId || idx} className={`p-3 rounded-xl bg-[#1A1C2E] border-l-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${match.isWin ? 'border-l-green-400' : 'border-l-red-400'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-xs">
                        {match.agentCode || 'AGT'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{match.mapName}</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">{match.dateLabel} • {match.roundLabel}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 justify-between md:justify-end">
                      <div className="text-center">
                        <div className={`font-black text-sm ${match.isWin ? 'text-green-400' : 'text-red-400'}`}>{match.scoreSummary}</div>
                        <div className="text-[9px] text-neutral-500">{match.isWin ? 'VICTORY' : 'DEFEAT'}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-white">{match.kills} / {match.deaths} / {match.assists}</div>
                        <div className="text-[9px] text-neutral-500">{match.kdRatio} K/D</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-[#E8B429]">{match.acs || '--'}</div>
                        <div className="text-[9px] text-neutral-500">ACS</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-cyan-400">{match.adr || '--'}</div>
                        <div className="text-[9px] text-neutral-500">ADR</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* 4. TAB 2: ROLES & WEAPONS */}
        {activeTab === 'roles-weapons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4 font-mono text-xs">
              <h3 className="font-bold text-white uppercase text-sm">Role Mastery Matrix</h3>
              {rolesBreakdown.map(role => (
                <div key={role.roleKey} className="p-3 bg-[#1A1C2E] rounded-xl flex justify-between">
                  <div><strong>{role.roleName}</strong><div className="text-neutral-500">{role.wins}W - {role.losses}L</div></div>
                  <div className="text-right text-green-400 font-bold">{role.winRatePct}% WR<div className="text-neutral-400">KDA {role.kdaRatio}</div></div>
                </div>
              ))}
            </div>

            <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4 font-mono text-xs">
              <h3 className="font-bold text-white uppercase text-sm">Weapons Hit Distribution</h3>
              {topWeapons.map(weapon => (
                <div key={weapon.weaponName} className="p-3 bg-[#1A1C2E] rounded-xl flex justify-between">
                  <div><strong>{weapon.weaponName}</strong> ({weapon.kills.toLocaleString()} Kills)<div className="text-neutral-500">{weapon.category}</div></div>
                  <div className="text-right text-[#E8B429] font-bold">{weapon.headPct}% Head · {weapon.bodyPct}% Body · {weapon.legPct}% Leg</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. TAB 3: MATCH TIMELINE */}
        {activeTab === 'matches' && (
          <div className="space-y-4 font-mono">
            <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">All Recent Matches in Act ({overview.rolling20Record})</h3>
              <p className="text-xs text-neutral-400">Please refer to the overview tab for match history details.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
