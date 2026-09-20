'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Star, TrendingUp, Map, Crosshair, History, Activity } from 'lucide-react';
import AthleteTelemetryHUD from '@/components/dashboard/AthleteTelemetryHUD';

interface PlayerIdentity {
  id: string;
  athlete_id: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
}

export default function AthleteProfilePage() {
  const params = useParams();
  const playerId = params?.userId as string;
  const supabase = useMemo(() => createClient(), []);

  const [player, setPlayer] = useState<PlayerIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'TRENDS' | 'MAPS' | 'WEAPONS'>('MATCHES');

  useEffect(() => {
    if (!playerId) return;

    let isMounted = true;

    const fetchPlayer = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, athlete_id, display_name, avatar_url, status')
        .eq('id', playerId)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        setNotFound(true);
      } else {
        setPlayer(data);
      }
      setLoading(false);
    };

    fetchPlayer();

    return () => {
      isMounted = false;
    };
  }, [playerId, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0E1A] flex items-center justify-center">
        <div className="text-[#E8B429] animate-pulse font-mono tracking-widest text-sm uppercase">
          LOADING PUBLIC ATHLETE PROFILE...
        </div>
      </div>
    );
  }

  if (notFound || !player) {
    return (
      <div className="min-h-screen bg-[#0D0E1A] flex items-center justify-center">
        <span className="text-zinc-500 font-mono text-sm">PLAYER NOT FOUND</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-[#E9E9ED] font-sans pb-20 custom-scrollbar">
      {/* IDENTITY STRIP */}
      <div className="border-b border-white/10 bg-[#121424] px-4 md:px-6 py-5 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2b2741] to-[#1a1c2e] border-2 border-[#E8B429] flex items-center justify-center text-2xl overflow-hidden shrink-0">
            {player.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatar_url} alt={player.display_name} className="w-full h-full object-cover" />
            ) : (
              '⚡'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-mono font-black text-white tracking-wider">{player.display_name}</h1>
              {player.status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1 bg-[#E8B429]/15 border border-[#E8B429]/40 text-[#E8B429] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-[#E8B429]" /> ACTIVE
                </span>
              )}
            </div>
            <span className="text-xs font-mono text-neutral-500">{player.athlete_id}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto pt-6">
        {/* TOP SECTION: Athlete Telemetry HUD (Overview & KPIs) */}
        <div className="mb-8 border-b border-white/10 pb-8">
          <AthleteTelemetryHUD playerId={player.id} />
        </div>

        {/* BOTTOM SECTION: Detailed Tracker-Style Analytics */}
        <div className="px-4 md:px-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-mono font-black text-white uppercase tracking-wider">Deep Analytics (Tracker)</h2>
          </div>

          {/* TABS */}
          <div className="flex gap-2 border-b border-white/10 mb-6 overflow-x-auto custom-scrollbar pb-2">
            {[
              { id: 'MATCHES', label: 'Match History', icon: History },
              { id: 'TRENDS', label: 'Trends', icon: TrendingUp },
              { id: 'MAPS', label: 'Maps', icon: Map },
              { id: 'WEAPONS', label: 'Weapons', icon: Crosshair },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all rounded-t-lg ${
                  activeTab === tab.id
                    ? 'bg-[#1A1C2E] border-t-2 border-t-cyan-400 text-cyan-400'
                    : 'border-t-2 border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENTS (Scaffolded for future API integration) */}
          <div className="bg-[#121424] border border-white/10 rounded-2xl p-6 min-h-[400px] shadow-xl">
            
            {activeTab === 'MATCHES' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase">Full Match Ledger</h3>
                <p className="text-xs text-neutral-400">Detailed list of all historical matches, filterable by Agent, Map, and Mode.</p>
                {/* Scaffold */}
                <div className="animate-pulse space-y-3 mt-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-[#1A1C2E] rounded-xl border border-white/5 w-full"></div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'TRENDS' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase">Performance Trends</h3>
                <p className="text-xs text-neutral-400">Multi-line charts tracking ACS, K/D, and Win Rate over the last 30 days.</p>
                {/* Scaffold */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="h-48 bg-[#1A1C2E] rounded-xl border border-white/5 w-full flex items-center justify-center flex-col gap-2">
                    <TrendingUp className="w-8 h-8 text-neutral-600" />
                    <span className="text-neutral-600 font-mono text-xs">ACS TREND CHART</span>
                  </div>
                  <div className="h-48 bg-[#1A1C2E] rounded-xl border border-white/5 w-full flex items-center justify-center flex-col gap-2">
                    <TrendingUp className="w-8 h-8 text-neutral-600" />
                    <span className="text-neutral-600 font-mono text-xs">K/D TREND CHART</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'MAPS' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase">Map Win Rates & Stats</h3>
                <p className="text-xs text-neutral-400">Comprehensive breakdown of performance per map.</p>
                {/* Scaffold */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {['Ascent', 'Bind', 'Lotus', 'Sunset', 'Haven'].map(map => (
                    <div key={map} className="p-4 bg-[#1A1C2E] rounded-xl border border-white/5 flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{map}</span>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-sm">55% WR</div>
                        <div className="text-neutral-500 text-[10px]">20 Matches</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'WEAPONS' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase">Weapon Analytics</h3>
                <p className="text-xs text-neutral-400">Detailed damage and kill statistics for all weapons.</p>
                {/* Scaffold */}
                <div className="mt-6 border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#1A1C2E] text-neutral-400">
                      <tr>
                        <th className="p-3 font-medium">Weapon</th>
                        <th className="p-3 font-medium">Kills</th>
                        <th className="p-3 font-medium text-cyan-400">Head %</th>
                        <th className="p-3 font-medium">Body %</th>
                        <th className="p-3 font-medium">Leg %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-neutral-300">
                      {[
                        { w: 'Vandal', k: 1450, h: 45, b: 50, l: 5 },
                        { w: 'Phantom', k: 890, h: 38, b: 58, l: 4 },
                        { w: 'Sheriff', k: 420, h: 55, b: 40, l: 5 },
                        { w: 'Operator', k: 210, h: 10, b: 85, l: 5 },
                      ].map(row => (
                        <tr key={row.w} className="hover:bg-white/5">
                          <td className="p-3 font-bold text-white">{row.w}</td>
                          <td className="p-3">{row.k}</td>
                          <td className="p-3 text-cyan-400 font-bold">{row.h}%</td>
                          <td className="p-3">{row.b}%</td>
                          <td className="p-3">{row.l}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
