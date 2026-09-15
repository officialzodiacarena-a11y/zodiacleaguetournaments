// components/dashboard/AthleteTelemetryHUD.tsx

'use client';

import React, { useState, useEffect } from 'react';
import {
  Star, Crosshair, Shield, Swords, Navigation, ShieldCheck,
  Cloud, ChevronDown, Filter, Calendar,
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

export default function AthleteTelemetryHUD() {
  const [activeTab, setActiveTab] = useState<'overview' | 'roles-weapons' | 'matches'>('overview');
  const [hudData, setHudData] = useState<TelemetryHudCompositePayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [matchFilterMap, setMatchFilterMap] = useState<string>('ALL');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTelemetryData() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/v1/players/me/telemetry-hud');
        const result = await response.json();
        if (result.success && result.data) {
          setHudData(result.data);
        }
      } catch (err) {
        console.error('Failed to load telemetry HUD data', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTelemetryData();
  }, []);

  if (isLoading || !hudData) {
    return (
      <div className="w-full min-h-[600px] bg-[#0D0E1A] text-white flex items-center justify-center font-mono">
        <div className="flex items-center gap-3 bg-[#121424] border border-[#E8B429]/30 px-6 py-4 rounded-2xl shadow-2xl">
          <div className="w-4 h-4 border-2 border-[#E8B429] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-[#E8B429] font-bold tracking-wider">LOADING ATHLETE TELEMETRY HUD...</span>
        </div>
      </div>
    );
  }

  const { overview, accuracyAnatomy, rolesBreakdown, topWeapons, rolling20Tiles, recent20Matches } = hudData;

  const filteredMatches = recent20Matches.filter((match) => {
    if (matchFilterMap === 'ALL') return true;
    return match.mapName.toUpperCase() === matchFilterMap.toUpperCase();
  });

  return (
    <div className="w-full bg-[#0D0E1A] text-white p-4 md:p-6 space-y-6 font-sans">
      {/* HEADER NAVIGATION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#121424] border border-white/10 p-4 rounded-2xl">
        <div className="flex items-center gap-6 text-xs font-mono font-bold tracking-wider">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-1 transition-all ${activeTab === 'overview' ? 'text-[#E8B429] border-b-2 border-[#E8B429]' : 'text-neutral-400 hover:text-white'}`}
          >
            OVERVIEW
          </button>
          <button
            onClick={() => setActiveTab('roles-weapons')}
            className={`pb-1 transition-all ${activeTab === 'roles-weapons' ? 'text-[#E8B429] border-b-2 border-[#E8B429]' : 'text-neutral-400 hover:text-white'}`}
          >
            ROLES & TOP WEAPONS
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`pb-1 transition-all ${activeTab === 'matches' ? 'text-[#E8B429] border-b-2 border-[#E8B429]' : 'text-neutral-400 hover:text-white'}`}
          >
            MATCH TIMELINE ({overview.rolling20Record})
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-[#1A1C2E] border border-white/10 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-neutral-400">AP-BANGKOK</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#E8B429]/10 border border-[#E8B429]/30 px-3 py-1.5 rounded-lg text-[#E8B429] font-bold">
            <span>{overview.apBalance} AP</span>
          </div>
          {overview.zpBalanceAvailable && (
            <div className="flex items-center gap-1.5 bg-[#9184D9]/10 border border-[#9184D9]/30 px-3 py-1.5 rounded-lg text-[#9184D9] font-bold">
              <span>{overview.zpBalance} ZP</span>
            </div>
          )}
        </div>
      </div>

      {/* 1. HERO PASSPORT STRIP */}
      <section className="relative overflow-hidden rounded-2xl bg-[#121424] border border-[#E8B429]/20 p-6 shadow-xl">
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
              {overview.zodiacSign && (
                <div className="absolute -bottom-1 -right-1 bg-black/80 border border-[#E8B429]/50 rounded-md px-1.5 py-0.5 text-[9px] font-mono text-[#E8B429]">
                  {overview.zodiacSign.toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-mono font-black text-white tracking-wider">
                  {overview.displayName}
                </h1>
                {overview.gameName && (
                  <span className="text-neutral-400 text-xs font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                    {overview.gameName}#{overview.tagLine}
                  </span>
                )}
                {overview.isVerified && (
                  <span className="inline-flex items-center gap-1 bg-[#E8B429]/15 border border-[#E8B429]/40 text-[#E8B429] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-[#E8B429]" /> VERIFIED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap text-[11px] font-mono font-bold">
                <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-2.5 py-0.5 rounded">
                  ★ {overview.metrics.wins ?? 0} W / {overview.metrics.losses ?? 0} L ({fmt(overview.metrics.winRatePct)}% WR)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-8 w-full lg:w-auto justify-between lg:justify-end font-mono">
            <div>
              <div className="text-[10px] uppercase text-neutral-400">Current Rating</div>
              <div className="text-2xl md:text-3xl font-black text-[#E8B429] drop-shadow-[0_0_12px_rgba(232,180,41,0.3)]">
                {overview.currentRankTier || 'UNRANKED'}{' '}
                {overview.currentRankRr !== null && (
                  <span className="text-xs font-normal text-neutral-400">{overview.currentRankRr} RR</span>
                )}
              </div>
            </div>

            {overview.peakRr !== null && (
              <div>
                <div className="text-[10px] uppercase text-neutral-400">Peak Rating</div>
                <div className="text-lg md:text-xl font-bold text-white">
                  {overview.peakRr} <span className="text-xs font-normal text-neutral-400">RR</span>
                </div>
                {overview.peakSeason && <div className="text-[10px] text-neutral-500">{overview.peakSeason}</div>}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. TELEMETRY KPI TILES */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 font-mono">
        <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-[#E8B429]">{fmt(overview.metrics.acs, 0)}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase mt-1">ACS</div>
        </div>
        <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-white">{fmt(overview.metrics.kdRatio, 2)}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase mt-1">K/D Ratio</div>
          <div className="text-[9px] text-neutral-500 mt-0.5">KDA {fmt(overview.metrics.kdaRatio, 2)}</div>
        </div>
        <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-white">{fmt(overview.metrics.adr, 0)}</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase mt-1">ADR</div>
        </div>
        <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-white">{fmt(overview.metrics.headshotPct, 1)}%</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase mt-1">Headshot %</div>
        </div>
        <div className="bg-[#121424] border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-green-400">{fmt(overview.metrics.winRatePct, 1)}%</div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase mt-1">Win %</div>
        </div>
      </section>

      {/* 3. TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono">
          <div className="lg:col-span-4 space-y-6">
            {/* ACCURACY ANATOMY */}
            <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>ACCURACY</span>
              </h3>

              {accuracyAnatomy ? (
                <div className="space-y-1.5 text-xs bg-[#1A1C2E] p-3 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Head</span>
                    <span className="font-bold text-cyan-400">{accuracyAnatomy.headPct}%</span>
                    <span className="text-[11px] text-neutral-400">{accuracyAnatomy.headHits} Hits</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Body</span>
                    <span className="font-bold text-cyan-400">{accuracyAnatomy.bodyPct}%</span>
                    <span className="text-[11px] text-neutral-400">{accuracyAnatomy.bodyHits} Hits</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Legs</span>
                    <span className="font-bold text-neutral-400">{accuracyAnatomy.legPct}%</span>
                    <span className="text-[11px] text-neutral-500">{accuracyAnatomy.legHits} Hits</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 bg-[#1A1C2E] p-3 rounded-xl border border-white/5">
                  ยังไม่มีข้อมูล Accuracy — รอ staff กรอกหลังจบแมตช์
                </p>
              )}
            </div>

            {/* ROLES BREAKDOWN */}
            <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>ROLES BREAKDOWN</span>
              </h3>

              {rolesBreakdown.length === 0 ? (
                <p className="text-[11px] text-neutral-500">ยังไม่มีข้อมูล Role</p>
              ) : (
                rolesBreakdown.map((role) => {
                  const RoleIcon = ROLE_ICONS[role.roleKey] ?? Shield;
                  const ringColor = ROLE_RING_COLORS[role.roleKey] ?? '#94A3B8';
                  return (
                    <div key={role.roleKey} className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A1C2E] border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full p-[2px] flex items-center justify-center border-2" style={{ borderColor: ringColor }}>
                          <div className="w-full h-full rounded-full bg-[#121424] flex items-center justify-center">
                            <RoleIcon className="w-4 h-4" style={{ color: ringColor }} />
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
                        <div className="text-[9px] text-neutral-400">{role.kills} / {role.deaths} / {role.assists}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* TOP WEAPONS */}
            <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair className="w-4 h-4 text-[#E8B429]" />
                <span>TOP WEAPONS</span>
              </h3>

              {topWeapons.length === 0 ? (
                <p className="text-[11px] text-neutral-500">ยังไม่มีข้อมูลอาวุธที่ใช้</p>
              ) : (
                topWeapons.map((weapon) => (
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
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            {/* SPARKLINE TILES */}
            <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/40 text-green-400 px-3 py-1 rounded-lg font-bold text-xs">
                  <span>{overview.rolling20Record}{overview.rolling20WinRatePct !== null && ` (${overview.rolling20WinRatePct}% Win Rate)`}</span>
                </div>
                <div className="text-xs text-neutral-400">Rolling {rolling20Tiles.length} Matches</div>
              </div>

              {rolling20Tiles.length === 0 ? (
                <p className="text-[11px] text-neutral-500 text-center py-4">ยังไม่มีประวัติแมตช์ที่จบแล้ว</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-10 gap-2">
                  {rolling20Tiles.map((tile, idx) => (
                    <div
                      key={tile.matchId || idx}
                      className={`rounded-lg p-2 text-center border ${tile.isWin ? 'bg-green-500/15 border-green-500/40' : 'bg-red-500/15 border-red-500/40'}`}
                    >
                      <div className="text-[9px] text-neutral-400">{tile.timeAgo}</div>
                      <div className={`text-xs font-black ${tile.isWin ? 'text-green-400' : 'text-red-400'}`}>{tile.scoreSummary}</div>
                      <div className="text-[9px] text-neutral-300">K/D {tile.kdRatio}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DETAILED MATCH ROWS */}
            <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-bold text-white">Recent Match History</span>
                <span className="text-xs text-neutral-400">{recent20Matches.length} Matches</span>
              </div>

              <div className="space-y-3">
                {recent20Matches.map((match) => (
                  <div
                    key={match.matchId}
                    className={`p-3 rounded-xl bg-[#1A1C2E] border-l-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${match.isWin ? 'border-l-green-400' : 'border-l-red-400'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-xs">
                        {match.agentCode}
                      </div>
                      <div>
                        <span className="font-bold text-white text-sm">{match.mapName}</span>
                        <div className="text-[10px] text-neutral-400">{match.dateLabel} {'//'} {match.roundLabel}</div>
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
                        <div className="font-bold text-[#E8B429]">{fmt(match.acs, 0)}</div>
                        <div className="text-[9px] text-neutral-500">ACS</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-cyan-400">{fmt(match.adr, 0)}</div>
                        <div className="text-[9px] text-neutral-500">ADR</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: ROLES & TOP WEAPONS */}
      {activeTab === 'roles-weapons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-bold text-white uppercase text-sm">Role Mastery Matrix</h3>
            {rolesBreakdown.length === 0 ? (
              <p className="text-neutral-500 text-[11px]">ยังไม่มีข้อมูล Role</p>
            ) : (
              rolesBreakdown.map((role) => (
                <div key={role.roleKey} className="p-3 bg-[#1A1C2E] rounded-xl flex justify-between border border-white/5">
                  <div>
                    <strong className="text-white text-sm">{role.roleName}</strong>
                    <div className="text-neutral-500">{role.wins}W - {role.losses}L</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">{role.winRatePct}% WR</div>
                    <div className="text-neutral-400">KDA {role.kdaRatio}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="font-bold text-white uppercase text-sm">Weapons Hit Distribution</h3>
            {topWeapons.length === 0 ? (
              <p className="text-neutral-500 text-[11px]">ยังไม่มีข้อมูลอาวุธที่ใช้</p>
            ) : (
              topWeapons.map((weapon) => (
                <div key={weapon.weaponName} className="p-3 bg-[#1A1C2E] rounded-xl flex justify-between border border-white/5">
                  <div>
                    <strong className="text-white text-sm">{weapon.weaponName}</strong> ({weapon.kills.toLocaleString()} Kills)
                    <div className="text-neutral-500">{weapon.category}</div>
                  </div>
                  <div className="text-right text-[#E8B429] font-bold">
                    {weapon.headPct}% Head · {weapon.bodyPct}% Body · {weapon.legPct}% Leg
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 3: MATCH TIMELINE */}
      {activeTab === 'matches' && (
        <div className="space-y-6 font-mono text-xs">
          <div className="bg-[#121424] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#E8B429]" />
                <span>MATCH HISTORY ({overview.rolling20Record})</span>
              </h3>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-400" />
                <select
                  value={matchFilterMap}
                  onChange={(e) => setMatchFilterMap(e.target.value)}
                  className="bg-[#1A1C2E] border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-[#E8B429]"
                >
                  <option value="ALL">All Maps ({recent20Matches.length})</option>
                  {Array.from(new Set(recent20Matches.map((m) => m.mapName))).map((mapName) => (
                    <option key={mapName} value={mapName}>{mapName}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredMatches.length === 0 ? (
              <p className="text-[11px] text-neutral-500 text-center py-6">ยังไม่มีประวัติแมตช์ที่จบแล้ว</p>
            ) : (
              <div className="space-y-3">
                {filteredMatches.map((match) => (
                  <div
                    key={match.matchId}
                    className={`p-4 rounded-xl bg-[#1A1C2E] border-l-4 ${match.isWin ? 'border-l-green-400' : 'border-l-red-400'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-xs">
                          {match.agentCode}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{match.mapName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${match.isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {match.isWin ? 'VICTORY' : 'DEFEAT'} ({match.scoreSummary})
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-400">{match.dateLabel} {'//'} {match.roundLabel}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 justify-between md:justify-end">
                        <div className="text-center">
                          <div className="font-bold text-white">{match.kills} / {match.deaths} / {match.assists}</div>
                          <div className="text-[9px] text-neutral-500">{match.kdRatio} K/D</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-[#E8B429]">{fmt(match.acs, 0)}</div>
                          <div className="text-[9px] text-neutral-500">ACS</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-cyan-400">{fmt(match.headshotPct, 1)}%</div>
                          <div className="text-[9px] text-neutral-500">HS %</div>
                        </div>
                        <button
                          onClick={() => setExpandedMatchId(expandedMatchId === match.matchId ? null : match.matchId)}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-neutral-300 font-mono text-[10px] flex items-center gap-1 transition-all"
                        >
                          <span>DETAILS</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedMatchId === match.matchId ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {expandedMatchId === match.matchId && (
                      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 gap-4 text-center bg-black/30 p-3 rounded-lg">
                        <div>
                          <div className="text-[9px] text-neutral-500">ADR</div>
                          <div className="font-bold text-cyan-400">{fmt(match.adr, 0)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-neutral-500">ACS</div>
                          <div className="font-bold text-[#E8B429]">{fmt(match.acs, 0)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-neutral-500">Headshot %</div>
                          <div className="font-bold text-white">{fmt(match.headshotPct, 1)}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
