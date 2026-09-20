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

          {/* TAB CONTENTS */}
          <div className="bg-[#121424] border border-white/10 rounded-2xl p-4 md:p-6 min-h-[400px] shadow-xl">
            
            {activeTab === 'MATCHES' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-white uppercase font-mono">Last 20 Matches</div>
                  <select className="bg-[#1A1C2E] border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-cyan-400">
                    <option>Competitive</option>
                    <option>Unrated</option>
                  </select>
                </div>
                
                {/* Match List Scaffold (Like Image 4) */}
                <div className="space-y-1">
                  {[
                    { agent: 'Omen', map: 'Haven', date: 'May 8, 08:56', res: '9:13', kd: '15/18/11', kdr: '0.83', hs: '35%', adr: '144', acs: '217', isWin: false, expanded: true },
                    { agent: 'Sova', map: 'Haven', date: 'May 8, 08:12', res: '13:11', kd: '20/16/7', kdr: '1.25', hs: '29%', adr: '160', acs: '245', isWin: true },
                    { agent: 'Viper', map: 'Pearl', date: 'May 2, 02:23', res: '5:13', kd: '12/15/5', kdr: '0.80', hs: '31%', adr: '124', acs: '191', isWin: false },
                    { agent: 'Viper', map: 'Lotus', date: 'May 2, 01:46', res: '13:7', kd: '19/14/7', kdr: '1.36', hs: '32%', adr: '185', acs: '269', isWin: true },
                    { agent: 'Cypher', map: 'Fracture', date: 'May 2, 01:17', res: '13:4', kd: '18/8/4', kdr: '2.25', hs: '19%', adr: '180', acs: '296', isWin: true, mvp: true },
                  ].map((m, i) => (
                    <div key={i} className="flex flex-col">
                      <div className={`grid grid-cols-12 items-center p-3 text-xs font-mono border-l-4 bg-[#1A1C2E] cursor-pointer hover:bg-white/5 transition-colors ${m.isWin ? 'border-l-[#10B981]' : 'border-l-[#EF4444]'} ${m.expanded ? 'rounded-t-lg' : 'rounded-lg mb-1'}`}>
                        {/* Agent & Map */}
                        <div className="col-span-3 flex items-center gap-3 pl-2">
                          <div className="w-10 h-10 rounded bg-[#2B2741] border border-white/10 flex items-center justify-center font-bold text-white text-[10px]">
                            {m.agent}
                          </div>
                          <div>
                            <div className="text-[10px] text-neutral-400">{m.date}</div>
                            <div className="font-bold text-white text-sm">{m.map}</div>
                          </div>
                        </div>
                        {/* Score */}
                        <div className="col-span-2 text-center">
                          <div className={`font-black text-sm ${m.isWin ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{m.res}</div>
                          {m.mvp && <div className="text-[9px] bg-[#E8B429] text-black px-1 rounded inline-block font-bold">MVP</div>}
                        </div>
                        {/* KDA */}
                        <div className="col-span-3 text-center">
                          <div className="text-[9px] text-neutral-500 mb-0.5">K / D / A</div>
                          <div className="font-bold text-white">{m.kd}</div>
                        </div>
                        {/* K/D & HS & ADR & ACS */}
                        <div className="col-span-4 flex items-center justify-between text-center pr-4">
                          <div>
                            <div className="text-[9px] text-neutral-500 mb-0.5">K/D</div>
                            <div className="font-bold text-white">{m.kdr}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-neutral-500 mb-0.5">HS%</div>
                            <div className="font-bold text-white">{m.hs}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-neutral-500 mb-0.5">ADR</div>
                            <div className="font-bold text-white">{m.adr}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-neutral-500 mb-0.5">ACS</div>
                            <div className="font-bold text-white">{m.acs}</div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Scoreboard (Like Image 3) */}
                      {m.expanded && (
                        <div className="bg-[#0D0E1A] border-x border-b border-[#1A1C2E] rounded-b-lg mb-1 p-4 font-mono text-[10px] sm:text-xs">
                          {/* Scoreboard Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <button className="bg-[#E8B429]/10 text-[#E8B429] px-4 py-1.5 rounded font-bold border border-[#E8B429]/30">Scoreboard</button>
                              <button className="text-neutral-500 hover:text-white transition-colors">Performance</button>
                            </div>
                            <div className="text-neutral-400">Match ID: {Math.random().toString(36).substr(2, 9)}</div>
                          </div>

                          {/* Team Table Scaffold */}
                          <div className="border border-white/5 rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                              <thead className="bg-[#1A1C2E] text-neutral-400 text-[10px] uppercase">
                                <tr>
                                  <th className="p-3 font-medium">Agent</th>
                                  <th className="p-3 font-medium">Player</th>
                                  <th className="p-3 font-medium text-center">Rank</th>
                                  <th className="p-3 font-medium text-center">K/D</th>
                                  <th className="p-3 font-medium text-center">ACS</th>
                                  <th className="p-3 font-medium text-center">K / D / A</th>
                                  <th className="p-3 font-medium text-center">HS%</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {[
                                  { agent: 'Omen', name: 'Flid', rank: 'Ascendant 3', kd: '1.10', acs: '214', kda: '21 / 15 / 8', hs: '27%', self: true },
                                  { agent: 'Reyna', name: 'Wxtty', rank: 'Ascendant 2', kd: '0.95', acs: '192', kda: '18 / 19 / 4', hs: '16%' },
                                  { agent: 'Jett', name: 'THRIVE Kong', rank: 'Ascendant 3', kd: '1.26', acs: '276', kda: '25 / 17 / 5', hs: '21%' },
                                  { agent: 'Sage', name: 'HiddenProfile', rank: 'Ascendant 1', kd: '0.80', acs: '150', kda: '12 / 15 / 10', hs: '18%', private: true },
                                  { agent: 'Fade', name: 'MINIMA Demon', rank: 'Ascendant 3', kd: '1.09', acs: '239', kda: '22 / 20 / 7', hs: '27%' },
                                ].map((p, j) => (
                                  <tr key={j} className={`hover:bg-white/5 ${p.self ? 'bg-[#10B981]/5' : ''}`}>
                                    <td className="p-3">
                                      <div className="w-8 h-8 rounded bg-[#2B2741] flex items-center justify-center font-bold text-[8px]">{p.agent}</div>
                                    </td>
                                    <td className="p-3">
                                      <div className={`font-bold ${p.self ? 'text-[#10B981]' : 'text-white'}`}>{p.name}</div>
                                      {p.private && <div className="text-[9px] text-neutral-500">Private Profile</div>}
                                    </td>
                                    <td className="p-3 text-center text-neutral-300">{p.rank}</td>
                                    <td className="p-3 text-center font-bold text-white">{p.kd}</td>
                                    <td className="p-3 text-center font-bold text-cyan-400">{p.acs}</td>
                                    <td className="p-3 text-center text-neutral-300">{p.kda}</td>
                                    <td className="p-3 text-center text-neutral-400">{p.hs}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-2 text-center text-[9px] text-neutral-500">
                            *This scoreboard is scaffolded to match the Tracker layout. Live 10-player match data requires Riot API approval.
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'TRENDS' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase">Performance Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="h-64 bg-[#1A1C2E] rounded-xl border border-white/5 w-full flex items-center justify-center flex-col gap-2">
                    <TrendingUp className="w-8 h-8 text-neutral-600" />
                    <span className="text-neutral-600 font-mono text-xs">ACS TREND CHART</span>
                  </div>
                  <div className="h-64 bg-[#1A1C2E] rounded-xl border border-white/5 w-full flex items-center justify-center flex-col gap-2">
                    <TrendingUp className="w-8 h-8 text-neutral-600" />
                    <span className="text-neutral-600 font-mono text-xs">K/D TREND CHART</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'MAPS' && (
              <div className="space-y-4 font-mono">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase">Map Win Rates & Stats</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { map: 'Ascent', wr: '55%', matches: 20, img: 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/listviewicon.png' },
                    { map: 'Bind', wr: '60%', matches: 15, img: 'https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/listviewicon.png' },
                    { map: 'Lotus', wr: '45%', matches: 22, img: 'https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/listviewicon.png' },
                    { map: 'Sunset', wr: '70%', matches: 10, img: 'https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/listviewicon.png' },
                    { map: 'Haven', wr: '50%', matches: 18, img: 'https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/listviewicon.png' },
                  ].map(m => (
                    <div key={m.map} className="relative overflow-hidden rounded-xl border border-white/10 group cursor-pointer h-24">
                      {/* Map Background Image */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 group-hover:opacity-60 transition-opacity"
                        style={{ backgroundImage: `url(${m.img})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#121424] via-[#121424]/80 to-transparent" />
                      
                      <div className="relative z-10 p-4 flex items-center justify-between h-full">
                        <span className="font-bold text-white text-base drop-shadow-md">{m.map}</span>
                        <div className="text-right">
                          <div className={`font-black text-lg drop-shadow-md ${parseInt(m.wr) >= 50 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                            {m.wr} WR
                          </div>
                          <div className="text-neutral-300 text-[10px] drop-shadow-md">{m.matches} Matches</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'WEAPONS' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white font-mono uppercase">Weapon Analytics</h3>
                <div className="mt-4 border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#1A1C2E] text-neutral-400">
                      <tr>
                        <th className="p-3 font-medium uppercase tracking-wider">Weapon</th>
                        <th className="p-3 font-medium uppercase tracking-wider">Kills</th>
                        <th className="p-3 font-medium uppercase tracking-wider text-cyan-400">Head %</th>
                        <th className="p-3 font-medium uppercase tracking-wider">Body %</th>
                        <th className="p-3 font-medium uppercase tracking-wider">Leg %</th>
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
                          <td className="p-4 font-bold text-white">{row.w}</td>
                          <td className="p-4">{row.k}</td>
                          <td className="p-4 text-cyan-400 font-bold">{row.h}%</td>
                          <td className="p-4">{row.b}%</td>
                          <td className="p-4">{row.l}%</td>
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
