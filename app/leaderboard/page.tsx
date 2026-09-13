/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const ROLES = ['GLOBAL', 'DUELIST', 'CONTROLLER', 'INITIATOR', 'SENTINEL'];
import { SponsorSlot } from '@/components/sponsor/SponsorSlot';
import { SkyscraperTower } from '@/components/sponsor/SkyscraperTower';

// ด้านใน return:
<main className="min-h-screen bg-[#0D0E1A] relative">
  <SkyscraperTower position="LEFT_TOWER" />
  <SkyscraperTower position="RIGHT_TOWER" />

  <div className="max-w-7xl mx-auto p-6">
    <SponsorSlot className="mb-6" />
    {/* เนื้อหา Leaderboard */}
  </div>
</main>
interface LeaderboardPlayer {
  id: string;
  athlete_id: string;
  display_name: string;
  avatar_url?: string;
  status: string;
  current_elo: number;
  karma_score: number;
  win_rate: number;
  recent_form: ('W' | 'L')[];
  role?: string;
  tier?: string;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('GLOBAL');
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [prizePool, setPrizePool] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // 1. Prize Pool Counter Animation
  useEffect(() => {
    const target = 15000;
    const duration = 1200;
    const steps = 40;
    const stepValue = target / steps;
    let current = 0;
    let stepCount = 0;
    const timer = setInterval(() => {
      current += stepValue;
      stepCount++;
      if (stepCount >= steps) {
        setPrizePool(target);
        clearInterval(timer);
      } else {
        setPrizePool(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Leaderboard from Block 1 Database Schema (players)
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('players')
          .select('id, athlete_id, display_name, avatar_url, status, ap_balance')
          .order('created_at', { ascending: true })
          .limit(50);

        if (error || !data || data.length === 0) {
          // Fallback ข้อมูลจำลองสไตล์ ZODIAC ARENA
          setPlayers([
            { id: '1', athlete_id: 'ZA-0001', display_name: 'SHADOW_ZX', current_elo: 1850, karma_score: 98, win_rate: 68.5, recent_form: ['W', 'W', 'W', 'L', 'W'], role: 'DUELIST', tier: 'IMMORTAL 3', status: 'ACTIVE' },
            { id: '2', athlete_id: 'ZA-0002', display_name: 'VIPER_QUEEN', current_elo: 1790, karma_score: 100, win_rate: 65.0, recent_form: ['W', 'L', 'W', 'W', 'W'], role: 'CONTROLLER', tier: 'IMMORTAL 3', status: 'ACTIVE' },
            { id: '3', athlete_id: 'ZA-0003', display_name: 'SOVA_GOD', current_elo: 1720, karma_score: 92, win_rate: 63.2, recent_form: ['W', 'W', 'L', 'W', 'L'], role: 'INITIATOR', tier: 'IMMORTAL 2', status: 'ACTIVE' },
            { id: '4', athlete_id: 'ZA-0004', display_name: 'CYPHER_TRAP', current_elo: 1680, karma_score: 88, win_rate: 61.8, recent_form: ['L', 'W', 'W', 'W', 'L'], role: 'SENTINEL', tier: 'IMMORTAL 2', status: 'ACTIVE' },
            { id: '5', athlete_id: 'ZA-0005', display_name: 'JETTDASH_99', current_elo: 1640, karma_score: 95, win_rate: 59.4, recent_form: ['W', 'L', 'L', 'W', 'W'], role: 'DUELIST', tier: 'IMMORTAL 1', status: 'ACTIVE' },
          ]);
        } else {
          const mapped: LeaderboardPlayer[] = data.map((p, idx) => ({
            id: p.id,
            athlete_id: p.athlete_id,
            display_name: p.display_name,
            avatar_url: p.avatar_url || undefined,
            status: p.status,
            current_elo: 1800 - idx * 35,
            karma_score: 95,
            win_rate: 64.0,
            recent_form: ['W', 'W', 'L', 'W', 'W'],
            role: ROLES[(idx % 4) + 1],
            tier: 'IMMORTAL',
          }));
          setPlayers(mapped);
        }
      } catch (err) {
        console.error('Leaderboard Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // 3. Supabase Realtime Subscription บนตาราง players
    const channel = supabase
      .channel('realtime_leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchLeaderboard())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Recent Form Badge Renderer
  const renderRecentForm = (form: ('W' | 'L')[]) => (
    <div className="flex items-center gap-1 justify-center font-mono">
      {form.map((res, i) => (
        <span
          key={i}
          className={`w-4 h-5 flex items-center justify-center text-[9px] font-black rounded-xs border ${
            res === 'W'
              ? 'border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10 shadow-[0_0_6px_rgba(74,222,128,0.2)]'
              : 'border-[#f87171]/40 text-[#f87171] bg-[#f87171]/10'
          }`}
        >
          {res}
        </span>
      ))}
    </div>
  );

  const filteredPlayers = players.filter(
    (p) => activeTab === 'GLOBAL' || p.role === activeTab
  );

  return (
    <main className="min-h-screen bg-[#0D0E1A] text-white pt-16 pb-16 px-4 md:px-8 font-mono relative select-none overflow-hidden">
      {/* Ambient Lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00D4FF]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#E8B429]/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Prize Pool Hero Card */}
      <div className="flex flex-col items-center justify-center mb-8 mt-6">
        <div className="relative border border-[#E8B429]/40 bg-[#12121A]/90 px-8 py-5 rounded-lg text-center min-w-[320px] md:min-w-[420px] shadow-[0_0_30px_rgba(232,180,41,0.15)] ring-1 ring-[#E8B429]/20">
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#E8B429]" />
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#E8B429]" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#E8B429]" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#E8B429]" />
          
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#E8B429]/80 font-bold mb-1">
            ZODIAC ARENA PRIZE POOL
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black text-[#E8B429]">THB</span>
            <h2 className="text-4xl font-black text-[#E8B429] tracking-wider drop-shadow-[0_0_15px_rgba(232,180,41,0.3)]">
              {prizePool.toLocaleString()}
            </h2>
          </div>
          <p className="text-[10px] text-neutral-500 tracking-widest mt-1.5 font-sans">
            ANNUAL CIRCUIT POOL · AUTO ALLOCATED (75%)
          </p>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-8">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setActiveTab(role)}
            className={`px-4 py-2 text-xs font-bold border uppercase tracking-wider transition-all duration-300 ${
              activeTab === role
                ? 'border-[#00D4FF] text-[#00D4FF] bg-[#00D4FF]/10 shadow-[0_0_15px_rgba(0,212,255,0.25)] ring-1 ring-[#00D4FF]/30'
                : 'border-white/10 text-neutral-400 hover:border-white/20 hover:text-white bg-[#1A1C2E]/50'
            }`}
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Leaderboard Table Container */}
      <div className="max-w-6xl mx-auto border border-[#00D4FF]/20 bg-[#12121A]/80 rounded-xl p-1 shadow-[0_0_30px_rgba(0,212,255,0.05)] backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#00D4FF]/20 text-[#00D4FF]/80 text-[11px] uppercase tracking-[0.2em] font-bold bg-[#00D4FF]/5">
                <th className="py-4 px-6 text-center w-[80px]">Rank</th>
                <th className="py-4 px-6">Athlete Identity</th>
                <th className="py-4 px-6 text-center w-[120px]">Rating</th>
                <th className="py-4 px-6 text-center w-[120px]">Win Rate</th>
                <th className="py-4 px-6 text-center w-[180px]">Recent Form</th>
                <th className="py-4 px-6 text-center w-[100px]">Karma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-500 animate-pulse tracking-widest text-xs">
                    SCANNING SECURE ARENA NETWORKS...
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-neutral-500 tracking-widest text-xs">
                    NO ATHLETES FOUND IN THIS DIVISION
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player, index) => (
                  <tr
                    key={player.id}
                    className="group hover:bg-[#00D4FF]/5 transition-all duration-200"
                  >
                    {/* Rank */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`text-sm font-bold ${
                          index === 0
                            ? 'text-[#E8B429] text-base drop-shadow-[0_0_8px_rgba(232,180,41,0.4)]'
                            : index === 1
                            ? 'text-neutral-300'
                            : index === 2
                            ? 'text-amber-600'
                            : 'text-neutral-500'
                        }`}
                      >
                        #{index + 1}
                      </span>
                    </td>

                    {/* Athlete Identity */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 border border-[#00D4FF]/30 bg-[#1A1C2E] rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {player.avatar_url ? (
                            <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-[#00D4FF] font-bold">🎮</span>
                          )}
                          <div className="absolute top-0 right-0 w-2 h-2 bg-[#4ade80] rounded-full border border-black shadow-[0_0_4px_#4ade80]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href="/profile"
                              className="text-sm font-bold tracking-wide text-neutral-200 group-hover:text-[#00D4FF] transition-colors"
                            >
                              {player.display_name}
                            </Link>
                            {player.role && (
                              <span className="px-1.5 py-0.5 text-[8px] border border-[#00D4FF]/40 text-[#00D4FF] bg-[#00D4FF]/10 uppercase tracking-widest rounded">
                                {player.role}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {player.athlete_id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Rating / ELO */}
                    <td className="py-4 px-6 text-center">
                      <span className="text-sm font-bold text-[#00D4FF] drop-shadow-[0_0_5px_rgba(0,212,255,0.2)]">
                        {player.current_elo}
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td className="py-4 px-6 text-center text-sm font-bold text-neutral-300">
                      {player.win_rate}%
                    </td>

                    {/* Recent Form */}
                    <td className="py-4 px-6 text-center">
                      {renderRecentForm(player.recent_form)}
                    </td>

                    {/* Karma Score */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded border ${
                          player.karma_score >= 90
                            ? 'border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/10'
                            : 'border-[#E8B429]/40 text-[#E8B429] bg-[#E8B429]/10'
                        }`}
                      >
                        {player.karma_score}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

