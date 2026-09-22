'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Clock,
  Layers,
  Sparkles,
  Maximize2,
  Tv,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Sliders,
  Users,
  Trophy,
  RefreshCw,
  Target,
  Armchair
} from 'lucide-react';

// Production overlay components
import { LiveScoreboard } from '@/components/overlay/LiveScoreboard';
import { LiveRosterSidebar } from '@/components/overlay/LiveRosterSidebar';
import { BuyPhaseHud, type BuyPhasePlayer } from '@/components/overlay/BuyPhaseHud';
import { TEAM_A_TEXT, TEAM_B_TEXT, DetailCell, type OverlayTeam, type OverlayVeto } from '@/components/overlay/series';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjygevsdfebdyzywbpdr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Y3j6k9biGK8YsBiHkaibkw_IcAFbWQj';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_MATCH_ID = 'a7606ae5-d83a-46f5-b422-652d5017b644';

export interface SqlMatchOption {
  id: string;
  status: string;
  tournament_id: string | null;
  tournament_name?: string | null;
  stage_id: string | null;
  best_of: number;
  lobby_code?: string | null;
  rounds_won_a: number;
  rounds_won_b: number;
  team_a_ready_at: string | null;
  team_b_ready_at: string | null;
  team_a?: { id: string; name: string; tag: string } | null;
  team_b?: { id: string; name: string; tag: string } | null;
}

export default function StreamHubMainPage({
  params
}: {
  params?: Promise<{ matchId?: string }> | { matchId?: string };
}) {
  const resolvedParams = params ? ('then' in params ? use(params) : params) : undefined;
  const initialMatchId = resolvedParams?.matchId || DEFAULT_MATCH_ID;

  // Active Scene ID:
  // 5: Live In-Game Overlay
  // 6: BuyPhase HUD
  // 7: Clean Map Veto Dashboard
  // 8: Clean Intermission & MVP Summary
  // 9: Spectator & Camera Control Room
  // 10: Captain Interactive Veto Room
  const [activeScene, setActiveScene] = useState<number>(5);

  // Theme & Viewport
  const [bgMode, setBgMode] = useState<'transparent' | 'amber' | 'arena' | 'chroma'>('transparent');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showBuyPhase, setShowBuyPhase] = useState<boolean>(false);

  // Active Match ID & Lists
  const [currentMatchId, setCurrentMatchId] = useState<string>(initialMatchId);
  const [tournamentMatches, setTournamentMatches] = useState<SqlMatchOption[]>([]);
  const [lobbyMatches, setLobbyMatches] = useState<SqlMatchOption[]>([]);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(false);

  // Dropdown open states
  const [openTournamentDropdown, setOpenTournamentDropdown] = useState<boolean>(false);
  const [openLobbyDropdown, setOpenLobbyDropdown] = useState<boolean>(false);

  // Active Match Real Database States
  const [activeMatchData, setActiveMatchData] = useState<SqlMatchOption | null>(null);
  const [teamA, setTeamA] = useState<OverlayTeam>({ id: 'team-a', name: 'MWL ESPORTS', tag: 'MWL' });
  const [teamB, setTeamB] = useState<OverlayTeam>({ id: 'team-b', name: 'DEFENDERS', tag: 'DEF' });
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [winsA, setWinsA] = useState<number>(0);
  const [winsB, setWinsB] = useState<number>(0);
  const [bestOf, setBestOf] = useState<number>(1);
  const [currentMap, setCurrentMap] = useState<string>('ASCENT');
  const [tournamentName, setTournamentName] = useState<string>('ZODIAC ARENA');
  const [subStage, setSubStage] = useState<string>('LIVE MATCH');

  // Real Rosters from database
  const [rosterA, setRosterA] = useState<BuyPhasePlayer[]>([
    { id: 'p1', name: 'MWL | Ming', agent: 'Jett', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 3900, armor: 'HEAVY', weapon: 'Vandal', ultPoints: 4, ultMax: 8 },
    { id: 'p2', name: 'scp20baht', agent: 'Sova', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 2400, armor: 'HEAVY', weapon: 'Phantom', ultPoints: 2, ultMax: 8 },
    { id: 'p3', name: 'MWL | 946a', agent: 'Omen', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 1900, armor: 'LIGHT', weapon: 'Vandal', ultPoints: 5, ultMax: 7 },
    { id: 'p4', name: 'MWL | Black Knight', agent: 'Cypher', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 4500, armor: 'HEAVY', weapon: 'Operator', ultPoints: 3, ultMax: 6 },
    { id: 'p5', name: 'MWL | BabyBaret', agent: 'Raze', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 2100, armor: 'LIGHT', weapon: 'Spectre', ultPoints: 1, ultMax: 8 },
  ]);

  const [rosterB, setRosterB] = useState<BuyPhasePlayer[]>([
    { id: 'p6', name: 'iykyk', agent: 'Reyna', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 3200, armor: 'HEAVY', weapon: 'Vandal', ultPoints: 6, ultMax: 7 },
    { id: 'p7', name: 'Roxy', agent: 'Killjoy', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 1500, armor: 'HEAVY', weapon: 'Phantom', ultPoints: 2, ultMax: 8 },
    { id: 'p8', name: 'MooDeng', agent: 'Viper', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 4100, armor: 'HEAVY', weapon: 'Ghost', ultPoints: 5, ultMax: 8 },
    { id: 'p9', name: 'MWL | Sariel', agent: 'Fade', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 2800, armor: 'HEAVY', weapon: 'Vandal', ultPoints: 3, ultMax: 8 },
    { id: 'p10', name: 'imyourmeowmeow', agent: 'Skye', kills: 0, deaths: 0, assists: 0, hp: 100, hpMax: 100, credits: 1200, armor: 'LIGHT', weapon: 'Sheriff', ultPoints: 2, ultMax: 7 },
  ]);

  // Real Map Vetoes from database
  const [realVetoes, setRealVetoes] = useState<OverlayVeto[]>([]);

  // Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(135);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenTournamentDropdown(false);
      setOpenLobbyDropdown(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // 1. FETCH ALL MATCHES FROM SQL
  const fetchAllMatchesFromSql = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select(`
          id,
          status,
          tournament_id,
          stage_id,
          format_config,
          best_of,
          rounds_won_a,
          rounds_won_b,
          team_a_ready_at,
          team_b_ready_at,
          created_at,
          tournaments:tournament_id ( id, name, status ),
          team_a:team_a_id ( id, name, tag ),
          team_b:team_b_id ( id, name, tag )
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && matchesData) {
        const formatted: SqlMatchOption[] = matchesData.map((m) => {
          const cfg = m.format_config as Record<string, unknown> | null;
          const tour = m.tournaments as unknown as { id: string; name: string; status: string } | null;
          const teamAObj = m.team_a as unknown as { id: string; name: string; tag: string } | null;
          const teamBObj = m.team_b as unknown as { id: string; name: string; tag: string } | null;
          return {
            id: m.id,
            status: m.status,
            tournament_id: m.tournament_id,
            tournament_name: tour?.name || (m.tournament_id ? 'Tournament Match' : null),
            stage_id: m.stage_id,
            best_of: m.best_of ?? 1,
            lobby_code: (cfg?.lobby_code as string) || null,
            rounds_won_a: m.rounds_won_a ?? 0,
            rounds_won_b: m.rounds_won_b ?? 0,
            team_a_ready_at: m.team_a_ready_at,
            team_b_ready_at: m.team_b_ready_at,
            team_a: teamAObj,
            team_b: teamBObj,
          };
        });

        // Group into Tournaments and Custom Lobbies
        setTournamentMatches(formatted.filter((m) => m.tournament_id !== null));
        setLobbyMatches(formatted.filter((m) => m.tournament_id === null || m.lobby_code !== null));
      }
    } catch (err) {
      console.error('Failed to fetch matches list from SQL:', err);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  // 2. LOAD SPECIFIC MATCH DATA FROM DATABASE
  const loadMatchDetails = useCallback(async (matchId: string) => {
    try {
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          *,
          tournaments:tournament_id ( id, name, status ),
          team_a:team_a_id ( id, name, tag, logo_url ),
          team_b:team_b_id ( id, name, tag, logo_url )
        `)
        .eq('id', matchId)
        .single();

      if (matchData) {
        const cfg = matchData.format_config as Record<string, unknown> | null;
        const tour = matchData.tournaments as { id: string; name: string; status: string } | null;

        setActiveMatchData({
          id: matchData.id,
          status: matchData.status,
          tournament_id: matchData.tournament_id,
          tournament_name: tour?.name || null,
          stage_id: matchData.stage_id,
          best_of: matchData.best_of ?? 1,
          lobby_code: (cfg?.lobby_code as string) || null,
          rounds_won_a: matchData.rounds_won_a ?? 0,
          rounds_won_b: matchData.rounds_won_b ?? 0,
          team_a_ready_at: matchData.team_a_ready_at,
          team_b_ready_at: matchData.team_b_ready_at,
          team_a: matchData.team_a,
          team_b: matchData.team_b,
        });

        if (matchData.team_a) setTeamA({ id: matchData.team_a.id, name: matchData.team_a.name, tag: matchData.team_a.tag });
        if (matchData.team_b) setTeamB({ id: matchData.team_b.id, name: matchData.team_b.name, tag: matchData.team_b.tag });
        setScoreA(matchData.rounds_won_a ?? 0);
        setScoreB(matchData.rounds_won_b ?? 0);
        setWinsA(0);
        setWinsB(0);
        setBestOf(matchData.best_of ?? 1);
        if (tour?.name) setTournamentName(tour.name);
        setSubStage(matchData.status === 'LIVE' ? 'LIVE MATCH' : matchData.status === 'READY_CHECK' ? 'READY CHECK (นั่งที่)' : matchData.status);
      }

      // Fetch Vetoes
      const { data: vetoData } = await supabase
        .from('map_vetoes')
        .select('*')
        .eq('match_id', matchId)
        .order('step_order', { ascending: true });

      if (vetoData && vetoData.length > 0) {
        setRealVetoes(vetoData.map(v => ({
          step_order: v.step_order,
          action: v.action,
          team_id: v.team_id,
          map_name: v.map_name,
          was_auto: v.was_auto
        })));
        const picked = vetoData.find(v => v.action === 'PICK');
        if (picked) setCurrentMap(picked.map_name);
      }
    } catch (err) {
      console.error('Failed to load match details:', err);
    }
  }, []);

  // Initial load & periodic poll
  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      if (!active) return;
      await fetchAllMatchesFromSql();
      await loadMatchDetails(currentMatchId);
    };
    void loadInitial();

    // 3s interval to check if players pressed "Ready" (นั่งที่)
    const interval = setInterval(() => {
      if (active) {
        void loadMatchDetails(currentMatchId);
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentMatchId, fetchAllMatchesFromSql, loadMatchDetails]);

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Alt+C hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'c' || e.key === 'C' || e.code === 'KeyC')) {
        e.preventDefault();
        setShowBuyPhase((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectMatch = (matchId: string) => {
    setCurrentMatchId(matchId);
    loadMatchDetails(matchId);
    setOpenTournamentDropdown(false);
    setOpenLobbyDropdown(false);
  };

  return (
    <div className={`min-h-screen font-sans ${bgMode === 'chroma' ? 'bg-[#00FF00]' : bgMode === 'transparent' ? 'bg-transparent' : 'bg-[#060810] text-white'}`}>
      
      {/* ========================================================================= */}
      {/* TOP HEADER CONTROLS */}
      {/* ========================================================================= */}
      {showControls && (
        <header className="sticky top-0 z-50 bg-[#0B0E1E]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 shadow-xl">
          <div className="max-w-7xl mx-auto flex flex-col gap-3">
            
            {/* Row 1: Title, Match ID Badge & OBS Options */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-black text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  ZODIAC STREAM HUB — LIVE BROADCAST ENGINE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SQL LIVE FEED
                </span>
                <div className="font-mono text-xs text-neutral-400 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  <span className="text-neutral-500">MATCH:</span>
                  <span className="text-cyan-300 font-bold">{currentMatchId.slice(0, 8)}...</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                    activeMatchData?.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {activeMatchData?.status || 'LIVE'}
                  </span>
                </div>
              </div>

              {/* Theme & OBS Options */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10 text-xs">
                  <button onClick={() => setBgMode('transparent')} className={`px-2 py-1 rounded text-[11px] font-mono ${bgMode === 'transparent' ? 'bg-purple-500/30 text-purple-300 font-bold' : 'text-neutral-400'}`}>OBS Alpha</button>
                  <button onClick={() => setBgMode('amber')} className={`px-2 py-1 rounded text-[11px] font-mono ${bgMode === 'amber' ? 'bg-amber-500/30 text-amber-300 font-bold' : 'text-neutral-400'}`}>Glow</button>
                  <button onClick={() => setBgMode('arena')} className={`px-2 py-1 rounded text-[11px] font-mono ${bgMode === 'arena' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-neutral-400'}`}>Cam Sim</button>
                  <button onClick={() => setBgMode('chroma')} className={`px-2 py-1 rounded text-[11px] font-mono ${bgMode === 'chroma' ? 'bg-green-500/30 text-green-300 font-bold' : 'text-neutral-400'}`}>Chroma</button>
                </div>

                <button onClick={() => setShowControls(false)} className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" />
                  OBS Mode
                </button>
              </div>
            </div>

            {/* Row 2: Real SQL Match Selectors (Blue: Tournament / Cyan: Lobby) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
              
              {/* TWO SELECTION BUTTONS: TOURNAMENT (BLUE) & LOBBY (CYAN) */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-neutral-400 font-mono text-xs font-bold">เลือกห้องแมตช์:</span>
                
                {/* 🔵 BLUE BUTTON: TOURNAMENT MATCHES */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setOpenTournamentDropdown(!openTournamentDropdown);
                      setOpenLobbyDropdown(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-black shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all border border-blue-400/30"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    Tournament Matches
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Tournament Dropdown Menu */}
                  {openTournamentDropdown && (
                    <div className="absolute top-full left-0 mt-1.5 w-96 max-h-80 overflow-y-auto bg-[#0d1226] border border-blue-500/40 rounded-2xl shadow-2xl p-2 z-50 font-mono space-y-1 backdrop-blur-xl">
                      <div className="text-[10px] text-blue-300 font-bold px-2 py-1 border-b border-white/10 uppercase flex items-center justify-between">
                        <span>ห้องแข่งทัวร์นาเมนต์ (SQL Live)</span>
                        <span>{tournamentMatches.length} แมตช์</span>
                      </div>
                      {tournamentMatches.length === 0 ? (
                        <div className="p-3 text-xs text-neutral-400 text-center">ไม่มีห้องแข่งทัวร์นาเมนต์ในขณะนี้</div>
                      ) : (
                        tournamentMatches.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMatch(m.id)}
                            className={`p-2.5 rounded-xl hover:bg-blue-600/20 border transition-all cursor-pointer space-y-1 ${
                              currentMatchId === m.id ? 'bg-blue-600/30 border-blue-400' : 'border-white/5 bg-black/40'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-black text-white">{m.team_a?.tag || 'A'} vs {m.team_b?.tag || 'B'}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                m.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {m.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">{m.tournament_name || 'Tournament Room'}</div>
                            
                            {/* Player Ready / Seat Status */}
                            <div className="flex items-center gap-3 text-[9px] pt-1 text-neutral-300 border-t border-white/5">
                              <span className="flex items-center gap-1">
                                <Armchair className="w-3 h-3 text-cyan-400" />
                                {m.team_a?.tag}: {m.team_a_ready_at ? <span className="text-emerald-400 font-bold">✓ นั่งแล้ว</span> : <span className="text-amber-400">⏳ รอนั่ง</span>}
                              </span>
                              <span className="flex items-center gap-1">
                                <Armchair className="w-3 h-3 text-rose-400" />
                                {m.team_b?.tag}: {m.team_b_ready_at ? <span className="text-emerald-400 font-bold">✓ นั่งแล้ว</span> : <span className="text-amber-400">⏳ รอนั่ง</span>}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* 🔷 CYAN BUTTON: LOBBY MATCHES */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setOpenLobbyDropdown(!openLobbyDropdown);
                      setOpenTournamentDropdown(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-mono text-xs font-black shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all border border-cyan-300/40"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    Lobby Matches
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Lobby Dropdown Menu */}
                  {openLobbyDropdown && (
                    <div className="absolute top-full left-0 mt-1.5 w-96 max-h-80 overflow-y-auto bg-[#091522] border border-cyan-500/40 rounded-2xl shadow-2xl p-2 z-50 font-mono space-y-1 backdrop-blur-xl">
                      <div className="text-[10px] text-cyan-300 font-bold px-2 py-1 border-b border-white/10 uppercase flex items-center justify-between">
                        <span>ห้องซ้อม Custom / Scrim / Lobby (SQL Live)</span>
                        <span>{lobbyMatches.length} แมตช์</span>
                      </div>
                      {lobbyMatches.length === 0 ? (
                        <div className="p-3 text-xs text-neutral-400 text-center">ไม่มีห้องล็อบบี้เปิดอยู่ในขณะนี้</div>
                      ) : (
                        lobbyMatches.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => handleSelectMatch(m.id)}
                            className={`p-2.5 rounded-xl hover:bg-cyan-600/20 border transition-all cursor-pointer space-y-1 ${
                              currentMatchId === m.id ? 'bg-cyan-600/30 border-cyan-400' : 'border-white/5 bg-black/40'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-black text-white">{m.team_a?.tag || 'A'} vs {m.team_b?.tag || 'B'}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 uppercase">
                                {m.lobby_code ? `LOBBY: ${m.lobby_code}` : m.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">Match ID: {m.id}</div>
                            
                            {/* Player Ready / Seat Status */}
                            <div className="flex items-center gap-3 text-[9px] pt-1 text-neutral-300 border-t border-white/5">
                              <span className="flex items-center gap-1">
                                <Armchair className="w-3 h-3 text-cyan-400" />
                                {m.team_a?.tag}: {m.team_a_ready_at ? <span className="text-emerald-400 font-bold">✓ นั่งแล้ว</span> : <span className="text-amber-400">⏳ รอนั่ง</span>}
                              </span>
                              <span className="flex items-center gap-1">
                                <Armchair className="w-3 h-3 text-rose-400" />
                                {m.team_b?.tag}: {m.team_b_ready_at ? <span className="text-emerald-400 font-bold">✓ นั่งแล้ว</span> : <span className="text-amber-400">⏳ รอนั่ง</span>}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* SYNC BUTTON */}
                <button
                  onClick={() => {
                    fetchAllMatchesFromSql();
                    loadMatchDetails(currentMatchId);
                  }}
                  disabled={loadingMatches}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold flex items-center gap-1.5 border border-white/20 transition-all"
                  title="Sync latest SQL database data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMatches ? 'animate-spin text-amber-400' : ''}`} />
                  Sync SQL
                </button>
              </div>

              {/* Ready Check Live Indicator */}
              <div className="flex items-center gap-3 font-mono text-xs bg-black/60 px-3 py-1 rounded-xl border border-white/10">
                <span className="text-neutral-400 font-bold">สถานะที่นั่ง (Ready):</span>
                <span className="flex items-center gap-1 text-cyan-300 font-bold">
                  {teamA.tag}: {activeMatchData?.team_a_ready_at ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-neutral-500" />}
                </span>
                <span className="flex items-center gap-1 text-rose-300 font-bold">
                  {teamB.tag}: {activeMatchData?.team_b_ready_at ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-neutral-500" />}
                </span>
              </div>

            </div>

            {/* Row 3: Scene Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
              <div className="flex items-center bg-cyan-950/50 p-1 rounded-xl border border-cyan-500/40 gap-1 flex-wrap">
                <span className="text-[10px] font-mono font-black text-cyan-400 px-2 py-0.5">
                  SYSTEM SCENES:
                </span>
                <button onClick={() => setActiveScene(5)} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${activeScene === 5 ? 'bg-cyan-500 text-black shadow-lg' : 'text-cyan-300 hover:bg-cyan-500/10'}`}>
                  <Tv className="w-3.5 h-3.5" /> 5. Ingame Live HUD
                </button>
                <button onClick={() => { setActiveScene(6); setShowBuyPhase(true); }} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${activeScene === 6 ? 'bg-cyan-500 text-black shadow-lg' : 'text-cyan-300 hover:bg-cyan-500/10'}`}>
                  <Users className="w-3.5 h-3.5" /> 6. BuyPhase HUD
                </button>
                <button onClick={() => setActiveScene(7)} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${activeScene === 7 ? 'bg-cyan-500 text-black shadow-lg' : 'text-cyan-300 hover:bg-cyan-500/10'}`}>
                  <Layers className="w-3.5 h-3.5" /> 7. Clean Map Veto
                </button>
                <button onClick={() => setActiveScene(8)} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${activeScene === 8 ? 'bg-cyan-500 text-black shadow-lg' : 'text-cyan-300 hover:bg-cyan-500/10'}`}>
                  <Trophy className="w-3.5 h-3.5" /> 8. Clean Intermission/MVP
                </button>
                <button onClick={() => setActiveScene(9)} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${activeScene === 9 ? 'bg-cyan-500 text-black shadow-lg' : 'text-cyan-300 hover:bg-cyan-500/10'}`}>
                  <Sliders className="w-3.5 h-3.5" /> 9. Spectator Control Room
                </button>
                <button onClick={() => setActiveScene(10)} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 ${activeScene === 10 ? 'bg-cyan-500 text-black shadow-lg' : 'text-cyan-300 hover:bg-cyan-500/10'}`}>
                  <Target className="w-3.5 h-3.5" /> 10. Captain Veto Room
                </button>
              </div>
            </div>

            {/* Row 4: Round Scores & Timer */}
            <div className="flex flex-wrap items-center justify-between text-xs text-neutral-300 gap-3 pt-1 border-t border-white/5">
              
              {/* Independent Round Scores */}
              <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-xl border border-white/15 font-mono">
                <span className="text-neutral-400 font-bold text-[11px]">Round Scores:</span>
                
                {/* Team A */}
                <div className="flex items-center gap-1 bg-[#00D4FF]/10 px-2 py-0.5 rounded border border-[#00D4FF]/30">
                  <span className="text-[#00D4FF] font-black text-xs">{teamA.tag}</span>
                  <button onClick={() => setScoreA(prev => Math.max(0, prev - 1))} className="w-5 h-5 rounded bg-white/10 hover:bg-[#00D4FF]/30 text-white font-black flex items-center justify-center text-xs">-</button>
                  <input type="number" min={0} max={99} value={scoreA} onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))} className="w-7 text-center bg-transparent text-white font-mono font-black text-sm outline-none" />
                  <button onClick={() => setScoreA(prev => prev + 1)} className="w-5 h-5 rounded bg-[#00D4FF]/20 hover:bg-[#00D4FF]/40 text-[#00D4FF] font-black flex items-center justify-center text-xs">+</button>
                </div>

                <span className="text-neutral-500 font-bold">:</span>

                {/* Team B */}
                <div className="flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                  <button onClick={() => setScoreB(prev => Math.max(0, prev - 1))} className="w-5 h-5 rounded bg-white/10 hover:bg-rose-500/30 text-white font-black flex items-center justify-center text-xs">-</button>
                  <input type="number" min={0} max={99} value={scoreB} onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))} className="w-7 text-center bg-transparent text-white font-mono font-black text-sm outline-none" />
                  <button onClick={() => setScoreB(prev => prev + 1)} className="w-5 h-5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 font-black flex items-center justify-center text-xs">+</button>
                  <span className="text-rose-400 font-black text-xs">{teamB.tag}</span>
                </div>

                {/* Buy Phase Alt+C */}
                <button
                  onClick={() => setShowBuyPhase(!showBuyPhase)}
                  className={`ml-1 px-2 py-0.5 rounded font-mono text-[11px] font-bold border transition-all ${
                    showBuyPhase ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-neutral-400 border-white/10'
                  }`}
                >
                  Buy Phase [Alt+C]: {showBuyPhase ? 'ON' : 'OFF'}
                </button>

                {/* HP Quick Controls */}
                <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10 text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold">HP:</span>
                  <button
                    onClick={() => {
                      setRosterA(prev => prev.map(p => ({ ...p, hp: 100, hpMax: 100 })));
                      setRosterB(prev => prev.map(p => ({ ...p, hp: 100, hpMax: 100 })));
                    }}
                    className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  >
                    100 All
                  </button>
                  <button
                    onClick={() => {
                      setRosterA(prev => prev.map(p => ({ ...p, hp: Math.max(0, (p.hp ?? 100) - 25) })));
                    }}
                    className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                  >
                    -25 MWL
                  </button>
                  <button
                    onClick={() => {
                      setRosterB(prev => prev.map(p => ({ ...p, hp: Math.max(0, (p.hp ?? 100) - 25) })));
                    }}
                    className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  >
                    -25 DEF
                  </button>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-white/15 font-mono shadow-inner flex-wrap">
                <span className="text-neutral-400 font-bold text-[11px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Timer:
                </span>
                
                <div className="flex items-center bg-white/10 rounded border border-white/20 px-1.5 py-0.5">
                  {timerSeconds >= 3600 && (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={Math.floor(timerSeconds / 3600).toString().padStart(2, '0')}
                        onChange={(e) => {
                          const hrs = Math.max(0, Math.min(99, parseInt(e.target.value) || 0));
                          const mins = Math.floor((timerSeconds % 3600) / 60);
                          const secs = timerSeconds % 60;
                          setTimerSeconds(hrs * 3600 + mins * 60 + secs);
                        }}
                        className="w-7 text-center bg-transparent text-amber-300 font-mono font-bold text-xs outline-none"
                      />
                      <span className="text-amber-400 font-bold">:</span>
                    </>
                  )}

                  <input
                    type="number"
                    min={0}
                    max={timerSeconds >= 3600 ? 59 : 999}
                    value={(timerSeconds >= 3600 ? Math.floor((timerSeconds % 3600) / 60) : Math.floor(timerSeconds / 60)).toString().padStart(2, '0')}
                    onChange={(e) => {
                      const inputVal = Math.max(0, parseInt(e.target.value) || 0);
                      const secs = timerSeconds % 60;
                      if (timerSeconds >= 3600) {
                        const hrs = Math.floor(timerSeconds / 3600);
                        const mins = Math.min(59, inputVal);
                        setTimerSeconds(hrs * 3600 + mins * 60 + secs);
                      } else {
                        setTimerSeconds(inputVal * 60 + secs);
                      }
                    }}
                    className="w-7 text-center bg-transparent text-white font-mono font-bold text-xs outline-none focus:text-amber-300"
                  />
                  <span className="text-amber-400 font-bold">:</span>
                  
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={(timerSeconds % 60).toString().padStart(2, '0')}
                    onChange={(e) => {
                      const secs = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                      const totalMins = Math.floor(timerSeconds / 60);
                      setTimerSeconds(totalMins * 60 + secs);
                    }}
                    className="w-7 text-center bg-transparent text-white font-mono font-bold text-xs outline-none focus:text-amber-300"
                  />
                </div>

                <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`p-1.5 rounded ${isTimerRunning ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
                <button onClick={() => setTimerSeconds(135)} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 border-l border-white/10 pl-1.5">
                  <button onClick={() => setTimerSeconds(300)} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px]">05:00</button>
                  <button onClick={() => setTimerSeconds(135)} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px]">02:15</button>
                  <button onClick={() => setTimerSeconds(prev => prev + 600)} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold">+10:00</button>
                  <button onClick={() => setTimerSeconds(prev => prev + 1200)} className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold">+20:00</button>
                  <button onClick={() => setTimerSeconds(prev => prev + 3600)} className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 text-[10px] font-bold">+1 Hrs</button>
                </div>
              </div>

            </div>

          </div>
        </header>
      )}

      {/* Restore Controls */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black border border-white/20 text-white font-mono text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md"
        >
          <Tv className="w-3.5 h-3.5 text-amber-400" />
          Show Controls
        </button>
      )}

      {/* 16:9 VIEWPORT CONTAINER */}
      <main className="w-full flex items-center justify-center p-0 md:p-4 lg:p-6">
        <div
          className={`relative w-full max-w-[1920px] aspect-[16/9] overflow-hidden rounded-none md:rounded-2xl shadow-2xl border ${
            bgMode === 'chroma' || bgMode === 'transparent' ? 'border-transparent' : 'border-white/10'
          }`}
        >

          {/* Backgrounds */}
          {bgMode === 'amber' && (
            <div className="absolute inset-0 bg-[#0d0703] overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/30 via-orange-950/20 to-[#070509]" />
            </div>
          )}
          {bgMode === 'arena' && (
            <div className="absolute inset-0 bg-neutral-900 overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 z-10" />
              <div className="absolute inset-0 flex items-center justify-center opacity-40 scale-105 filter blur-[1px]">
                <div className="w-full h-full bg-[radial-gradient(circle_at_center,_#ff4400_0%,_#0a0814_70%)]" />
              </div>
            </div>
          )}
          {bgMode === 'chroma' && <div className="absolute inset-0 bg-[#00FF00]" />}

          {/* ========================================================================= */}
          {/* SCENE 5: REAL PRODUCTION LIVE INGAME HUD (Clean without Sponsor Towers) */}
          {/* ========================================================================= */}
          {activeScene === 5 && (
            <div className="relative w-full h-full">
              <LiveScoreboard
                teamA={{ tag: teamA.tag, logo_url: null }}
                teamB={{ tag: teamB.tag, logo_url: null }}
                winsNeeded={1}
                winsA={winsA}
                winsB={winsB}
                roundsA={scoreA}
                roundsB={scoreB}
                mapLabel="MAP 1"
                mapName={currentMap}
              />

              {/* Conditionally render: Show Buy Phase HUD OR Sidebars (Never both at once) */}
              {showBuyPhase ? (
                <BuyPhaseHud
                  visible={showBuyPhase}
                  teamA={{ name: teamA.name, tag: teamA.tag }}
                  teamB={{ name: teamB.name, tag: teamB.tag }}
                  rosterA={rosterA}
                  rosterB={rosterB}
                />
              ) : (
                <>
                  <LiveRosterSidebar roster={rosterA} side="left" team="A" />
                  <LiveRosterSidebar roster={rosterB} side="right" team="B" />
                </>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCENE 6: REAL BUYPHASE HUD DEDICATED VIEW */}
          {/* ========================================================================= */}
          {activeScene === 6 && (
            <div className="relative w-full h-full flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <LiveScoreboard
                teamA={{ tag: teamA.tag, logo_url: null }}
                teamB={{ tag: teamB.tag, logo_url: null }}
                winsNeeded={1}
                winsA={winsA}
                winsB={winsB}
                roundsA={scoreA}
                roundsB={scoreB}
                mapLabel="MAP 1"
                mapName={currentMap}
              />
              <BuyPhaseHud
                visible={true}
                teamA={{ name: teamA.name, tag: teamA.tag }}
                teamB={{ name: teamB.name, tag: teamB.tag }}
                rosterA={rosterA}
                rosterB={rosterB}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCENE 7: CLEAN MAP VETO DASHBOARD (Without Skyscraper Sponsor Towers) */}
          {/* ========================================================================= */}
          {activeScene === 7 && (
            <section className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-30 p-12">
              <div className="w-[1200px] bg-[#12121A]/90 border border-gray-800 rounded-2xl p-8 relative shadow-[0_0_50px_rgba(0,212,255,0.05)]">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/40 to-transparent" />

                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-6">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF] tracking-wider uppercase font-bold">
                      VETO COMPLETE • {subStage}
                    </span>
                    <h2 className="text-3xl font-black text-white font-mono tracking-widest uppercase mt-2">
                      Map Veto Dashboard
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 font-mono">BO{bestOf} SERIES CONFIG</p>
                    <p className="text-sm font-black font-mono mt-1 text-[#C9A84C]">
                      <span className={TEAM_A_TEXT}>{teamA.tag}</span> VS <span className={TEAM_B_TEXT}>{teamB.tag}</span>
                    </p>
                  </div>
                </div>

                {/* Match Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <DetailCell label="Tournament" value={tournamentName} />
                  <DetailCell label="Stage" value={subStage} />
                  <DetailCell label="Series Score" value={`${winsA} - ${winsB}`} valueClass="text-[#C9A84C]" />
                  <DetailCell label="Active Map" value={currentMap} valueClass="text-[#00D4FF]" />
                </div>

                {/* 5 Veto Steps Cards */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                    Veto Sequence History:
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {realVetoes.map((v, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border bg-black/60 font-mono space-y-2 ${
                          v.action === 'BAN' ? 'border-rose-500/40 text-rose-300' : 'border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>STEP {v.step_order}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 uppercase">{v.action}</span>
                        </div>
                        <div className="text-lg font-black text-white">{v.map_name}</div>
                        <div className="text-[10px] text-neutral-400">
                          {v.team_id === teamA.id ? teamA.tag : v.team_id === teamB.id ? teamB.tag : 'DECIDER'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SCENE 8: CLEAN INTERMISSION & MVP SUMMARY (Without Skyscraper Towers) */}
          {/* ========================================================================= */}
          {activeScene === 8 && (
            <section className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-30 p-12">
              <div className="w-[1200px] bg-[#12121A]/90 border border-gray-800 rounded-2xl p-8 relative shadow-2xl">
                
                <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 uppercase font-bold">
                      MATCH INTERMISSION
                    </span>
                    <h2 className="text-3xl font-black text-white font-mono tracking-widest uppercase mt-2">
                      Series Summary & Highlights
                    </h2>
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-400">
                    <span className={TEAM_A_TEXT}>{teamA.tag} {scoreA}</span> - <span className={TEAM_B_TEXT}>{scoreB} {teamB.tag}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-7 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <DetailCell label="Tournament" value={tournamentName} />
                      <DetailCell label="Stage" value={subStage} />
                      <DetailCell label="Format" value={`BO${bestOf}`} />
                    </div>

                    <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2 font-mono">
                      <div className="text-xs text-neutral-400 font-bold uppercase">Current Game:</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black text-white">{currentMap}</span>
                        <span className="text-sm font-bold text-amber-300">MAP 1 • IN PROGRESS</span>
                      </div>
                    </div>
                  </div>

                  {/* MVP Highlight Box */}
                  <div className="col-span-5 p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-black border border-cyan-500/30 space-y-3 font-mono">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                      MVP FOR CURRENT MAP
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl font-black text-cyan-300">
                        JETT
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">นายหนิว eSport (illiYhad)</h4>
                        <span className="text-xs text-cyan-400">[{teamA.tag}] • Jett</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                      <div className="p-2 bg-black/40 rounded">
                        <div className="text-[9px] text-neutral-400">K / D / A</div>
                        <div className="text-sm font-black text-white">24/12/7</div>
                      </div>
                      <div className="p-2 bg-black/40 rounded">
                        <div className="text-[9px] text-neutral-400">AVG ACS</div>
                        <div className="text-sm font-black text-cyan-300">298</div>
                      </div>
                      <div className="p-2 bg-black/40 rounded">
                        <div className="text-[9px] text-neutral-400">HS RATE</div>
                        <div className="text-sm font-black text-amber-300">32%</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SCENE 9: SPECTATOR CAMERA CONTROL ROOM (Observer Desk) */}
          {/* ========================================================================= */}
          {activeScene === 9 && (
            <div className="relative w-full h-full p-6 bg-[#080a14] overflow-y-auto text-white">
              <div className="max-w-6xl mx-auto space-y-6">
                
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-mono text-xs font-black text-amber-400 uppercase tracking-wider">
                        OBSERVER CAMERA CONTROL ROOM (SPECTATOR DESK)
                      </span>
                    </div>
                    <h2 className="text-2xl font-black font-mono tracking-tight mt-1">
                      {teamA.name} vs {teamB.name} — Observer Telemetry Bridge
                    </h2>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono bg-black/60 px-4 py-2 rounded-xl border border-white/10">
                    <div>Status: <span className="text-emerald-400 font-bold">HEALTHY</span></div>
                    <div>FPS: <span className="text-white font-bold">60.0</span></div>
                    <div>Bitrate: <span className="text-amber-300 font-bold">6,500 kbps</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team A Control */}
                  <div className="p-5 rounded-2xl bg-neutral-900/90 border border-cyan-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-mono font-black text-cyan-400 text-sm">{teamA.name} (DEFENSE)</span>
                      <span className="font-mono text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">Score: {scoreA}</span>
                    </div>

                    <div className="space-y-3">
                      {rosterA.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between text-xs font-mono bg-black/40 p-2 rounded-lg border border-white/5">
                          <div className="truncate max-w-[180px]">
                            <span className="font-bold text-white block truncate">{p.name}</span>
                            <span className="text-cyan-400 text-[10px]">{p.agent} • {p.weapon}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400">HP: {p.hp}</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={p.hp}
                              onChange={(e) => {
                                const newHp = parseInt(e.target.value);
                                setRosterA(prev => prev.map((pl, i) => i === idx ? { ...pl, hp: newHp } : pl));
                              }}
                              className="w-20 accent-cyan-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team B Control */}
                  <div className="p-5 rounded-2xl bg-neutral-900/90 border border-rose-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-mono font-black text-rose-400 text-sm">{teamB.name} (ATTACK)</span>
                      <span className="font-mono text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">Score: {scoreB}</span>
                    </div>

                    <div className="space-y-3">
                      {rosterB.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between text-xs font-mono bg-black/40 p-2 rounded-lg border border-white/5">
                          <div className="truncate max-w-[180px]">
                            <span className="font-bold text-white block truncate">{p.name}</span>
                            <span className="text-rose-400 text-[10px]">{p.agent} • {p.weapon}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400">HP: {p.hp}</span>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={p.hp}
                              onChange={(e) => {
                                const newHp = parseInt(e.target.value);
                                setRosterB(prev => prev.map((pl, i) => i === idx ? { ...pl, hp: newHp } : pl));
                              }}
                              className="w-20 accent-rose-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 pt-2">
                  <button onClick={() => setActiveScene(5)} className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black font-mono text-xs shadow-lg">
                    Switch to Live Observer View &rarr;
                  </button>
                  <button onClick={() => setActiveScene(6)} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black font-mono text-xs shadow-lg">
                    Open BuyPhase Table &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SCENE 10: CAPTAIN INTERACTIVE VETO ROOM */}
          {/* ========================================================================= */}
          {activeScene === 10 && (
            <div className="relative w-full h-full p-8 bg-[#090b17] overflow-y-auto text-white">
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-mono text-amber-400 font-bold uppercase">TEAM CAPTAINS LOBBY</span>
                    <h2 className="text-2xl font-black font-mono uppercase mt-1">Interactive Map Ban & Pick Room</h2>
                  </div>
                  <div className="font-mono text-xs text-neutral-400">
                    Match: <span className="text-cyan-300 font-bold">{currentMatchId.slice(0, 8)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3">
                  {realVetoes.length > 0 ? (
                    realVetoes.map((m, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-white/10 bg-black/60 font-mono space-y-2">
                        <div className="text-xs text-neutral-400 font-bold">{m.map_name}</div>
                        <div className="text-sm font-black text-amber-300">{m.action}</div>
                        <div className="text-[10px] text-neutral-500">{m.team_id === teamA.id ? teamA.tag : m.team_id === teamB.id ? teamB.tag : 'DECIDER'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-5 text-center p-4 text-neutral-500 font-mono text-xs">
                      กำลังรอขั้นตอน Veto จากฐานข้อมูล...
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300">
                  ⚡ Veto Engine Tick Rate: 5,000ms • Auto-pick on timeout enabled • Authenticated as Team Captain
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
