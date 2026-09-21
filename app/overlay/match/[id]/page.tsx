"use client";

import React, { useEffect, useState, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { VetoScene } from "@/components/overlay/VetoScene";
import { IntermissionScene } from "@/components/overlay/IntermissionScene";

export type MatchStatus =
  | "SCHEDULED"
  | "READY_CHECK"
  | "VETO"
  | "LIVE"
  | "PAUSED"
  | "AWAITING_RESULT"
  | "DISPUTED"
  | "COMPLETED"
  | "FORFEITED"
  | "WALKOVER"
  | "BYE"
  | "CANCELLED";

export type VetoActionType = "BAN" | "PICK" | "DECIDER" | "SIDE_PICK";

export interface TeamMetadata {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
}

export interface MatchData {
  id: string;
  tournament_id: string;
  stage_id: string | null;
  status: MatchStatus;
  best_of: number;
  score_a: number;
  score_b: number;
  rounds_won_a: number;
  rounds_won_b: number;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_ready_at: string | null;
  team_b_ready_at: string | null;
  lobby_code: string | null;
  round_label?: string | null;
  team_a?: TeamMetadata;
  team_b?: TeamMetadata;
}

export interface MatchGame {
  id: string;
  match_id: string;
  game_number: number;
  map_name: string | null;
  score_a: number;
  score_b: number;
  winner_team_id: string | null;
  team_a_side_start: string | null;
  team_b_side_start: string | null;
  status: string;
}

export interface MapVeto {
  id: string;
  match_id: string;
  step_order: number;
  action: VetoActionType;
  team_id: string | null;
  map_name: string;
  side_choice: string | null;
  was_auto: boolean;
}

export interface MVPlayerStats {
  id: string;
  display_name: string;
  team_tag: string;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  headshot_pct: number;
  agent_played: string;
}

export interface BuyPhasePlayer {
  id: string;
  name: string;
  agent: string;
  kills: number;
  deaths: number;
  assists: number;
  ultPoints: number;
  ultMax: number;
  armor: "HEAVY" | "LIGHT" | "NONE";
  weapon: string;
  credits: number;
  minNext: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- WEAPON & SHIELD ICONS ---
function WeaponIcon({ name }: { name: string }) {
  const upper = name.toUpperCase();
  if (upper.includes("OPERATOR") || upper.includes("OP")) {
    return (
      <svg className="w-16 h-5 text-white/90" viewBox="0 0 100 24" fill="currentColor">
        <path d="M2 14h18l4-3h20v2h12l6-4h26l8 3v4l-4 2H60l-4-2H24l-6 3H2v-5z" opacity="0.9" />
        <rect x="42" y="5" width="22" height="3" rx="1" />
        <circle cx="53" cy="6.5" r="2.5" fill="#00D4FF" />
      </svg>
    );
  }
  if (upper.includes("PHANTOM")) {
    return (
      <svg className="w-14 h-5 text-white/90" viewBox="0 0 80 24" fill="currentColor">
        <path d="M4 14h14l4-3h24l4 3h26v4l-6 2H42l-4-2H20l-4 2H4v-6z" opacity="0.9" />
        <rect x="64" y="10" width="14" height="4" rx="1" fill="#00D4FF" />
      </svg>
    );
  }
  if (upper.includes("SHERIFF") || upper.includes("GHOST") || upper.includes("CLASSIC") || upper.includes("PISTOL")) {
    return (
      <svg className="w-8 h-5 text-white/90" viewBox="0 0 40 24" fill="currentColor">
        <path d="M6 10h22l4 3v4l-4 2H18l-3 4H9l3-4H6v-5z" opacity="0.9" />
      </svg>
    );
  }
  if (upper.includes("SPECTRE") || upper.includes("STINGER")) {
    return (
      <svg className="w-12 h-5 text-white/90" viewBox="0 0 60 24" fill="currentColor">
        <path d="M4 12h12l3-3h18l3 3h16v4l-4 2H32l-3-2H16l-3 2H4v-6z" opacity="0.9" />
        <rect x="22" y="16" width="6" height="7" rx="1" fill="#C9A84C" />
      </svg>
    );
  }
  // Default: Vandal / Assault Rifle
  return (
    <svg className="w-14 h-5 text-white/90" viewBox="0 0 80 24" fill="currentColor">
      <path d="M2 13h16l5-4h28l4 3h20v4l-5 2H46l-4-2H22l-5 3H2v-6z" opacity="0.95" />
      <path d="M34 15l-3 8h6l2-8h-5z" fill="#C9A84C" opacity="0.8" />
    </svg>
  );
}

function ShieldIcon({ type }: { type: "HEAVY" | "LIGHT" | "NONE" }) {
  if (type === "HEAVY") {
    return (
      <div className="flex items-center gap-0.5 text-white/90 font-mono text-[10px] font-bold">
        <svg className="w-4 h-4 text-[#00D4FF]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 3.99-2.55 7.7-6 8.78-3.45-1.08-6-4.79-6-8.78V6.43l6-2.25z" />
          <path d="M12 6.5l-4 1.5v3.1c0 2.7 1.7 5.2 4 5.9 2.3-.7 4-3.2 4-5.9v-3.1l-4-1.5z" />
        </svg>
        <span className="text-[9px] text-[#00D4FF]">50</span>
      </div>
    );
  }
  if (type === "LIGHT") {
    return (
      <div className="flex items-center gap-0.5 text-white/80 font-mono text-[10px] font-bold">
        <svg className="w-4 h-4 text-cyan-300/80" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 2.18l6 2.25v4.66c0 3.99-2.55 7.7-6 8.78-3.45-1.08-6-4.79-6-8.78V6.43l6-2.25z" />
        </svg>
        <span className="text-[9px] text-cyan-300">25</span>
      </div>
    );
  }
  return <div className="w-4 h-4 opacity-10" />;
}

function UltDots({ current, max }: { current: number; max: number }) {
  const isReady = current >= max;
  return (
    <div className="flex items-center gap-1">
      {isReady ? (
        <span className="px-1.5 py-0.2 bg-[#00D4FF]/20 border border-[#00D4FF]/80 text-[#00D4FF] rounded text-[9px] font-mono font-black animate-pulse">
          READY
        </span>
      ) : (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: max }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i < current
                  ? "bg-[#00D4FF] shadow-[0_0_4px_#00D4FF]"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Fallback rosters when match participants are initializing
const DEFAULT_ROSTER_A: BuyPhasePlayer[] = [
  { id: "a1", name: "Voodoo One", agent: "Reyna", kills: 0, deaths: 0, assists: 0, ultPoints: 5, ultMax: 7, armor: "HEAVY", weapon: "Operator", credits: 2900, minNext: 2100 },
  { id: "a2", name: "Twoperator", agent: "Clove", kills: 0, deaths: 0, assists: 0, ultPoints: 4, ultMax: 8, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
  { id: "a3", name: "ThreeOfLife", agent: "Fade", kills: 0, deaths: 0, assists: 0, ultPoints: 6, ultMax: 7, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
  { id: "a4", name: "Fourcefield", agent: "Killjoy", kills: 0, deaths: 0, assists: 0, ultPoints: 7, ultMax: 7, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
  { id: "a5", name: "FIVEbyFIVE", agent: "Jett", kills: 0, deaths: 0, assists: 0, ultPoints: 3, ultMax: 8, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
];

const DEFAULT_ROSTER_B: BuyPhasePlayer[] = [
  { id: "b1", name: "AlpacaHoarder", agent: "KAY/O", kills: 0, deaths: 0, assists: 0, ultPoints: 4, ultMax: 7, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
  { id: "b2", name: "BeeSting", agent: "Waylay", kills: 0, deaths: 0, assists: 0, ultPoints: 6, ultMax: 7, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
  { id: "b3", name: "CowTipper", agent: "Neon", kills: 0, deaths: 0, assists: 0, ultPoints: 3, ultMax: 8, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
  { id: "b4", name: "DodoDaniel", agent: "Fade", kills: 0, deaths: 0, assists: 0, ultPoints: 7, ultMax: 7, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
  { id: "b5", name: "Eellminator", agent: "Breach", kills: 0, deaths: 0, assists: 0, ultPoints: 5, ultMax: 7, armor: "HEAVY", weapon: "Vandal", credits: 2900, minNext: 2100 },
];

export default function MatchBroadcastOverlay({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = "then" in params ? use(params) : params;
  const matchId = resolvedParams.id;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [games, setGames] = useState<MatchGame[]>([]);
  const [vetoes, setVetoes] = useState<MapVeto[]>([]);
  const [mvp, setMvp] = useState<MVPlayerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [broadcastScene, setBroadcastScene] = useState<"VETO" | "LIVE" | "AWAITING_RESULT" | null>(null);
  const [hudBanner, setHudBanner] = useState<{ type: string; message: string } | null>(null);
  const [showBuyPhase, setShowBuyPhase] = useState<boolean>(false);
  const [rosterA, setRosterA] = useState<BuyPhasePlayer[]>(DEFAULT_ROSTER_A);
  const [rosterB, setRosterB] = useState<BuyPhasePlayer[]>(DEFAULT_ROSTER_B);
  const [tournamentName, setTournamentName] = useState<string | null>(null);
  const [stageName, setStageName] = useState<string | null>(null);

  // บังคับพื้นหลังโปร่งใสให้ OBS Browser Source ดึงไปใช้ได้จริง
  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
    };
  }, []);

  // Hotkey listener สำหรับ Alt+C เพื่อ Toggle Buy Phase HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C" || e.code === "KeyC")) {
        e.preventDefault();
        setShowBuyPhase((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      if (!matchId) return;
      try {
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select(`
            *,
            team_a:team_a_id ( id, name, tag, logo_url ),
            team_b:team_b_id ( id, name, tag, logo_url )
          `)
          .eq("id", matchId)
          .single();

        if (matchError || !matchData) {
          throw new Error(matchError?.message || "ไม่พบข้อมูลแมตช์บนระบบ");
        }

        if (!isMounted) return;

        const teamAData = Array.isArray(matchData.team_a) ? matchData.team_a[0] : matchData.team_a;
        const teamBData = Array.isArray(matchData.team_b) ? matchData.team_b[0] : matchData.team_b;

        if (!teamAData || !teamBData) {
          throw new Error("ไม่พบข้อมูลทีมของแมตช์นี้ในระบบ (team_a/team_b ว่างเปล่า)");
        }

        const refinedMatch: MatchData = {
          ...matchData,
          team_a: teamAData,
          team_b: teamBData,
        };

        setMatch(refinedMatch);

        // ชื่อทัวร์นาเมนต์ / Stage สำหรับแถบรายละเอียดแมตช์ (ดึงแยก: ถ้าพลาดจะแสดง "—" และไม่กระทบ Overlay)
        try {
          const [tournamentRes, stageRes] = await Promise.all([
            matchData.tournament_id
              ? supabase.from("tournaments").select("name").eq("id", matchData.tournament_id).maybeSingle()
              : Promise.resolve({ data: null }),
            matchData.stage_id
              ? supabase.from("tournament_stages").select("name").eq("id", matchData.stage_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          if (isMounted) {
            setTournamentName(tournamentRes.data?.name ?? null);
            setStageName(stageRes.data?.name ?? null);
          }
        } catch (nameErr) {
          console.error("Failed to fetch tournament/stage names:", nameErr);
        }

        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('id, team_id, players!team_members_player_id_fkey(display_name)')
          .in('team_id', [teamAData.id, teamBData.id]);

        if (teamMembers) {
          const agentsA = ['Jett', 'Reyna', 'Omen', 'Killjoy', 'Sova'];
          const agentsB = ['Raze', 'Phoenix', 'Brimstone', 'Cypher', 'Breach'];
          const newRosterA = teamMembers.filter(m => m.team_id === teamAData.id).map((m, idx) => ({
            id: m.id, name: (Array.isArray(m.players) ? m.players[0]?.display_name : (m.players as { display_name?: string } | null)?.display_name) || "Unknown", agent: agentsA[idx % 5], kills: 0, deaths: 0, assists: 0, ultPoints: 0, ultMax: 7, armor: "HEAVY" as const, weapon: 'Vandal', credits: 8000, minNext: 2000
          }));
          const newRosterB = teamMembers.filter(m => m.team_id === teamBData.id).map((m, idx) => ({
            id: m.id, name: (Array.isArray(m.players) ? m.players[0]?.display_name : (m.players as { display_name?: string } | null)?.display_name) || "Unknown", agent: agentsB[idx % 5], kills: 0, deaths: 0, assists: 0, ultPoints: 0, ultMax: 7, armor: "HEAVY" as const, weapon: 'Phantom', credits: 8000, minNext: 2000
          }));
          if (newRosterA.length) setRosterA(newRosterA);
          if (newRosterB.length) setRosterB(newRosterB);
        }


        const { data: gamesData, error: gamesError } = await supabase
          .from("match_games")
          .select("*")
          .eq("match_id", matchId)
          .order("game_number", { ascending: true });

        if (!gamesError && gamesData && isMounted) {
          setGames(gamesData);
        }

        try {
          const mvpRes = await fetch(`/api/v1/matches/${matchId}/mvp`);
          if (mvpRes.ok && isMounted) {
            const mvpJson = await mvpRes.json();
            if (mvpJson.mvp) {
              setMvp(mvpJson.mvp as MVPlayerStats);
            }
          }
        } catch (mvpErr) {
          console.error("Failed to fetch MVP stats:", mvpErr);
        }

        try {
          const partRes = await fetch(`/api/v1/matches/${matchId}/participants`);
          if (partRes.ok && isMounted) {
            const partJson = await partRes.json();
            if (partJson.games && partJson.games.length > 0) {
              const latestGame = partJson.games[partJson.games.length - 1];
              const parts = latestGame.participants || [];
              const teamAParts = parts.filter((p: { team_id: string }) => p.team_id === teamAData.id);
              const teamBParts = parts.filter((p: { team_id: string }) => p.team_id === teamBData.id);

              if (teamAParts.length > 0) {
                setRosterA(
                  teamAParts.map((p: { player_id: string; display_name: string; agent_played: string; kills: number; deaths: number; assists: number }, idx: number) => ({
                    id: p.player_id || `a-${idx}`,
                    name: p.display_name || DEFAULT_ROSTER_A[idx]?.name || `Player ${idx + 1}`,
                    agent: p.agent_played || DEFAULT_ROSTER_A[idx]?.agent || "Agent",
                    kills: p.kills ?? 0,
                    deaths: p.deaths ?? 0,
                    assists: p.assists ?? 0,
                    ultPoints: DEFAULT_ROSTER_A[idx]?.ultPoints ?? 4,
                    ultMax: DEFAULT_ROSTER_A[idx]?.ultMax ?? 7,
                    armor: (DEFAULT_ROSTER_A[idx]?.armor as "HEAVY" | "LIGHT" | "NONE") ?? "HEAVY",
                    weapon: DEFAULT_ROSTER_A[idx]?.weapon ?? "Vandal",
                    credits: 2900,
                    minNext: 2100,
                  }))
                );
              }

              if (teamBParts.length > 0) {
                setRosterB(
                  teamBParts.map((p: { player_id: string; display_name: string; agent_played: string; kills: number; deaths: number; assists: number }, idx: number) => ({
                    id: p.player_id || `b-${idx}`,
                    name: p.display_name || DEFAULT_ROSTER_B[idx]?.name || `Player ${idx + 1}`,
                    agent: p.agent_played || DEFAULT_ROSTER_B[idx]?.agent || "Agent",
                    kills: p.kills ?? 0,
                    deaths: p.deaths ?? 0,
                    assists: p.assists ?? 0,
                    ultPoints: DEFAULT_ROSTER_B[idx]?.ultPoints ?? 4,
                    ultMax: DEFAULT_ROSTER_B[idx]?.ultMax ?? 7,
                    armor: (DEFAULT_ROSTER_B[idx]?.armor as "HEAVY" | "LIGHT" | "NONE") ?? "HEAVY",
                    weapon: DEFAULT_ROSTER_B[idx]?.weapon ?? "Vandal",
                    credits: 2900,
                    minNext: 2100,
                  }))
                );
              }
            }
          }
        } catch (partErr) {
          console.error("Failed to fetch participant rosters:", partErr);
        }

        const { data: vetoData, error: vetoError } = await supabase
          .from("map_vetoes")
          .select("*")
          .eq("match_id", matchId)
          .order("step_order", { ascending: true });

        if (!vetoError && vetoData && isMounted) {
          setVetoes(vetoData);
        }

        if (isMounted) setErrorMessage(null);
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "ระบบสแกนเครือข่ายล้มเหลว";
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialData();

    const matchChannel = supabase
      .channel(`match-realtime-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        (payload) => {
          const updatedMatch = payload.new as MatchData;
          setMatch((prev) => (prev ? { ...prev, ...updatedMatch } : updatedMatch));
          setBroadcastScene(null);
          fetchInitialData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_games", filter: `match_id=eq.${matchId}` },
        () => {
          fetchInitialData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "map_vetoes", filter: `match_id=eq.${matchId}` },
        () => {
          fetchInitialData();
        }
      )
      .on("broadcast", { event: "stream_telemetry_relay" }, (payload) => {
        console.log("Realtime stream health telemetries received:", payload);
      })
      .on("broadcast", { event: "scene_change" }, (payload) => {
        const scene = (payload.payload as { scene?: string })?.scene;
        if (scene === "VETO" || scene === "LIVE" || scene === "AWAITING_RESULT") {
          if (isMounted) setBroadcastScene(scene);
        }
      })
      .on("broadcast", { event: "toggle_buy_phase" }, (payload) => {
        const data = payload.payload as { enabled?: boolean };
        if (typeof data?.enabled === "boolean") {
          if (isMounted) setShowBuyPhase(data.enabled);
        } else {
          if (isMounted) setShowBuyPhase((prev) => !prev);
        }
      })
      .on("broadcast", { event: "hud_notification" }, (payload) => {
        const data = payload.payload as { type?: string; message?: string };
        if (isMounted && data?.message) {
          setHudBanner({ type: data.type || "NORMAL", message: data.message });
        }
      })
      .on("broadcast", { event: "hud_notification_clear" }, () => {
        if (isMounted) setHudBanner(null);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(matchChannel);
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0F] font-mono text-xs font-bold text-[#00D4FF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00D4FF] border-t-transparent" />
          <span>[ RETRIEVING BROADCAST CORE DATA SIGNAL... ]</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !match) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0F] font-mono text-xs font-bold text-rose-500">
        <div className="border border-rose-500/20 bg-rose-500/5 p-6 rounded-lg uppercase tracking-widest text-center">
          <p className="mb-2">🚨 BROADCAST ERROR SIGNAL DETECTED</p>
          <p className="text-gray-500">{errorMessage || "MATCH METADATA NULL"}</p>
        </div>
      </div>
    );
  }

  const { team_a, team_b, status, score_a, score_b, rounds_won_a, rounds_won_b } = match;
  const displayStatus = broadcastScene ?? status;
  const showScoreboard = displayStatus === "LIVE" || status === "PAUSED";
  const activeGame = games.find((g) => g.status === "LIVE") || games[games.length - 1];
  const mapName = activeGame?.map_name || "DECIDING_MAP";
  const isMatchPoint = rounds_won_a === 12 || rounds_won_b === 12;
  const isOvertime = rounds_won_a >= 12 && rounds_won_b >= 12;

  // Calculators for Team Bank totals
  const totalBankA = rosterA.reduce((sum, p) => sum + p.credits, 0) || 14500;
  const totalMinNextA = rosterA.reduce((sum, p) => sum + p.minNext, 0) || 10500;
  const totalBankB = rosterB.reduce((sum, p) => sum + p.credits, 0) || 14500;
  const totalMinNextB = rosterB.reduce((sum, p) => sum + p.minNext, 0) || 10500;

  return (
    <main className="relative w-[1920px] h-[1080px] bg-transparent text-white overflow-hidden font-sans select-none">
      {/* 0. HUD NOTIFICATION BANNER */}
      {hudBanner && (
        <section className="absolute top-[120px] left-1/2 -translate-x-1/2 z-[60]">
          <div
            className={`px-6 py-2.5 rounded-full border backdrop-blur-md shadow-lg ${
              hudBanner.type === "PAUSE"
                ? "bg-amber-500/15 border-amber-500/60 text-amber-300"
                : hudBanner.type === "MATCH_POINT"
                  ? "bg-rose-500/15 border-rose-500/60 text-rose-300"
                  : "bg-[#00D4FF]/15 border-[#00D4FF]/60 text-[#00D4FF]"
            }`}
          >
            <span className="font-mono text-xs font-black uppercase tracking-[2px]">{hudBanner.message}</span>
          </div>
        </section>
      )}

      {/* 1. TOP COMPACT SCOREBOARD CENTER */}
      {showScoreboard && (
        <section className="absolute top-0 left-1/2 -translate-x-1/2 flex items-stretch h-[56px] w-[580px] bg-[#0A0A0F]/90 backdrop-blur-md border-b-2 border-[#C9A84C]/80 rounded-b-xl z-50 overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          {/* TEAM A */}
          <div className="flex-1 flex items-center justify-end px-4 gap-3 bg-gradient-to-r from-transparent to-[#FF4655]/5">
            <span className="font-mono text-lg font-black tracking-widest text-white uppercase">{team_a?.tag}</span>
            <div className="h-8 w-8 flex items-center justify-center bg-gray-900 border border-white/10 rounded-md">
              <span className="font-mono text-xs text-gray-400">🛡️</span>
            </div>
            <div className="flex gap-1">
              <div className={`h-2 w-2 rounded-full ${score_a >= 1 ? "bg-[#C9A84C] shadow-[0_0_8px_#C9A84C]" : "bg-neutral-800"}`} />
              <div className={`h-2 w-2 rounded-full ${score_a >= 2 ? "bg-[#C9A84C] shadow-[0_0_8px_#C9A84C]" : "bg-neutral-800"}`} />
            </div>
          </div>

          {/* ROUNDS SCORE */}
          <div className="w-[140px] flex items-center justify-center border-x border-white/10 relative">
            <div className="flex items-center gap-4">
              <span className="font-mono text-3xl font-black text-[#FF4655] tracking-tighter leading-none w-10 text-right">{rounds_won_a}</span>
              <span className="font-mono text-xs font-bold text-gray-500 tracking-widest">VS</span>
              <span className="font-mono text-3xl font-black text-[#00D4FF] tracking-tighter leading-none w-10 text-left">{rounds_won_b}</span>
            </div>
            <span className="absolute bottom-1 font-mono text-[8px] font-black text-[#00D4FF] uppercase tracking-[2px]">{mapName}</span>
          </div>

          {/* TEAM B */}
          <div className="flex-1 flex items-center justify-start px-4 gap-3 bg-gradient-to-l from-transparent to-[#00D4FF]/5">
            <div className="flex gap-1">
              <div className={`h-2 w-2 rounded-full ${score_b >= 1 ? "bg-[#C9A84C] shadow-[0_0_8px_#C9A84C]" : "bg-neutral-800"}`} />
              <div className={`h-2 w-2 rounded-full ${score_b >= 2 ? "bg-[#C9A84C] shadow-[0_0_8px_#C9A84C]" : "bg-neutral-800"}`} />
            </div>
            <div className="h-8 w-8 flex items-center justify-center bg-gray-900 border border-white/10 rounded-md">
              <span className="font-mono text-xs text-gray-400">⚔️</span>
            </div>
            <span className="font-mono text-lg font-black tracking-widest text-white uppercase">{team_b?.tag}</span>
          </div>
        </section>
      )}

      {/* 2. DYNAMIC BROADCAST EVENT BADGES */}
      {showScoreboard && (
        <section className="absolute top-[64px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-40">
          {status === "PAUSED" && (
            <div className="animate-pulse px-4 py-1 bg-amber-500/10 border border-amber-500/50 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <span className="font-mono text-[10px] font-black text-amber-400 uppercase tracking-[3px]">TECHNICAL PAUSE</span>
            </div>
          )}
          {isOvertime && (
            <div className="px-4 py-1 bg-[#C9A84C]/10 border border-[#C9A84C]/50 rounded-full shadow-[0_0_10px_rgba(201,168,76,0.2)]">
              <span className="font-mono text-[10px] font-black text-[#C9A84C] uppercase tracking-[3px]">OVERTIME ROUND</span>
            </div>
          )}
          {!isOvertime && isMatchPoint && (
            <div className="px-4 py-1 bg-rose-500/10 border border-rose-500/50 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              <span className="font-mono text-[10px] font-black text-rose-400 uppercase tracking-[3px]">MATCH POINT</span>
            </div>
          )}
        </section>
      )}

      
      {/* SPONSOR LOGO */}
      {showScoreboard && (
        <section className="absolute bottom-8 left-8 z-40">
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20">
            <div className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-widest">Official Sponsor</div>
            <div className="text-xl font-black text-white italic">ZODIAC LOGO</div>
          </div>
        </section>
      )}

      {/* LEFT SIDEBAR (TEAM A) */}
      {showScoreboard && (
        <section className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40 w-[300px]">
          {rosterA.map((player) => (
            <div key={player.id} className="flex items-center gap-3 bg-[#0A0A0F]/80 backdrop-blur-md border border-[#00D4FF]/50 rounded-r-xl p-2 shadow-lg">
              <div className="w-12 h-12 bg-gray-800 rounded-md border border-white/20 flex items-center justify-center text-xs font-black text-[#00D4FF]">{player.agent.slice(0,2).toUpperCase()}</div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white truncate">{player.name}</div>
                <div className="w-full h-1.5 bg-gray-700 mt-1 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00D4FF] w-[100%]" />
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-gray-300 w-12 text-right">100 HP</div>
            </div>
          ))}
        </section>
      )}

      {/* RIGHT SIDEBAR (TEAM B) */}
      {showScoreboard && (
        <section className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40 w-[300px]">
          {rosterB.map((player) => (
            <div key={player.id} className="flex items-center gap-3 bg-[#0A0A0F]/80 backdrop-blur-md border border-[#FF4655]/50 rounded-l-xl p-2 shadow-lg flex-row-reverse">
              <div className="w-12 h-12 bg-gray-800 rounded-md border border-white/20 flex items-center justify-center text-xs font-black text-[#FF4655]">{player.agent.slice(0,2).toUpperCase()}</div>
              <div className="flex-1 text-right">
                <div className="text-xs font-bold text-white truncate">{player.name}</div>
                <div className="w-full h-1.5 bg-gray-700 mt-1 rounded-full overflow-hidden flex justify-end">
                  <div className="h-full bg-[#FF4655] w-[100%]" />
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-gray-300 w-12 text-left">100 HP</div>
            </div>
          ))}
        </section>
      )}

      {/* 3. MAP VETO OVERLAY (Sponsor Towers + Match Details + Series Map Order) */}
      {displayStatus === "VETO" && team_a && team_b && (
        <VetoScene
          teamA={team_a}
          teamB={team_b}
          bestOf={match.best_of ?? 3}
          matchCode={match.id.slice(0, 8).toUpperCase()}
          tournamentName={tournamentName}
          stageName={stageName}
          roundLabel={match.round_label ?? null}
          seriesScoreA={score_a ?? 0}
          seriesScoreB={score_b ?? 0}
          vetoes={vetoes}
          games={games}
        />
      )}

      {/* 4. INTERMISSION & STATS TRANSITIONS (Sponsor Towers + Series Score + All Games + MVP) */}
      {displayStatus === "AWAITING_RESULT" && team_a && team_b && (
        <IntermissionScene
          teamA={team_a}
          teamB={team_b}
          bestOf={match.best_of ?? 3}
          matchCode={match.id.slice(0, 8).toUpperCase()}
          tournamentName={tournamentName}
          stageName={stageName}
          roundLabel={match.round_label ?? null}
          vetoes={vetoes}
          games={games}
          mvp={mvp}
        />
      )}

      {/* 5. BUY PHASE HUD OVERLAY (TOGGLED VIA ALT+C OR REALTIME BROADCAST) */}
      <section
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[1760px] z-50 transition-all duration-300 transform pointer-events-none ${
          showBuyPhase ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
        }`}
      >
        <div className="grid grid-cols-2 gap-8">
          {/* TEAM A BUY PHASE CARD (LEFT) */}
          <div className="relative bg-[#0b0f19]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* TIMEOUTS BADGE */}
            <div className="absolute -top-1 left-6 -translate-y-1/2 bg-[#0A0D14] border border-cyan-500/40 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
              <span className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest">TIMEOUTS</span>
              <div className="flex gap-1 text-[#00D4FF] text-[10px]">
                <span>◆</span>
                <span>◆</span>
              </div>
            </div>

            {/* TEAM A HEADER */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3 mt-1">
              <div>
                <h2 className="text-2xl font-black text-white tracking-wide uppercase font-sans">
                  {team_a?.name || "Team A"}
                </h2>
                <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                  [{team_a?.tag || "TMA"}]
                </span>
              </div>
              <div className="text-right font-mono">
                <div className="text-emerald-400 font-black text-sm flex items-center justify-end gap-1">
                  <span className="text-[10px] opacity-70">BANK</span>
                  <span className="text-base tracking-tight">¤ {totalBankA.toLocaleString()}</span>
                </div>
                <div className="text-gray-400 font-bold text-[10px] flex items-center justify-end gap-1">
                  <span className="opacity-70">MIN NEXT:</span>
                  <span>¤ {totalMinNextA.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* TEAM A PLAYER ROWS */}
            <div className="space-y-2">
              {rosterA.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 rounded-xl border border-white/5 transition"
                >
                  {/* Avatar & Player Name */}
                  <div className="flex items-center gap-3 w-[200px]">
                    <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-gradient-to-br from-[#1c2237] to-[#121624] border border-white/20 flex items-center justify-center font-mono text-xs font-black text-[#00D4FF]">
                      {player.agent.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-[#00D4FF] block font-bold uppercase tracking-wider">
                        {player.agent}
                      </span>
                      <span className="font-bold text-xs text-white truncate block max-w-[140px]">
                        {player.name}
                      </span>
                    </div>
                  </div>

                  {/* KDA */}
                  <div className="w-[85px] text-center font-mono text-xs text-gray-300 font-bold">
                    <span>{player.kills}</span>
                    <span className="text-gray-600 px-1">/</span>
                    <span>{player.deaths}</span>
                    <span className="text-gray-600 px-1">/</span>
                    <span>{player.assists}</span>
                  </div>

                  {/* Ultimate Points */}
                  <div className="w-[85px] flex justify-center">
                    <UltDots current={player.ultPoints} max={player.ultMax} />
                  </div>

                  {/* Armor */}
                  <div className="w-[50px] flex justify-center">
                    <ShieldIcon type={player.armor} />
                  </div>

                  {/* Weapon */}
                  <div className="w-[120px] flex justify-center">
                    <WeaponIcon name={player.weapon} />
                  </div>

                  {/* Credits & Min Next */}
                  <div className="w-[100px] text-right font-mono">
                    <span className="text-emerald-400 font-bold text-xs block">
                      ¤ {player.credits.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-[9px] block">
                      ¤ {player.minNext.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TEAM B BUY PHASE CARD (RIGHT) */}
          <div className="relative bg-[#0b0f19]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* TIMEOUTS BADGE */}
            <div className="absolute -top-1 right-6 -translate-y-1/2 bg-[#0A0D14] border border-rose-500/40 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
              <span className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest">TIMEOUTS</span>
              <div className="flex gap-1 text-[#FF4655] text-[10px]">
                <span>◆</span>
                <span>◆</span>
              </div>
            </div>

            {/* TEAM B HEADER */}
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3 mt-1">
              <div className="text-left font-mono">
                <div className="text-emerald-400 font-black text-sm flex items-center justify-start gap-1">
                  <span className="text-[10px] opacity-70">BANK</span>
                  <span className="text-base tracking-tight">¤ {totalBankB.toLocaleString()}</span>
                </div>
                <div className="text-gray-400 font-bold text-[10px] flex items-center justify-start gap-1">
                  <span className="opacity-70">MIN NEXT:</span>
                  <span>¤ {totalMinNextB.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-white tracking-wide uppercase font-sans">
                  {team_b?.name || "Team B"}
                </h2>
                <span className="font-mono text-[10px] text-rose-400 font-bold uppercase tracking-widest">
                  [{team_b?.tag || "TMB"}]
                </span>
              </div>
            </div>

            {/* TEAM B PLAYER ROWS (MIRRORED LAYOUT) */}
            <div className="space-y-2">
              {rosterB.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 rounded-xl border border-white/5 transition"
                >
                  {/* Credits & Min Next */}
                  <div className="w-[100px] text-left font-mono">
                    <span className="text-emerald-400 font-bold text-xs block">
                      ¤ {player.credits.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-[9px] block">
                      ¤ {player.minNext.toLocaleString()}
                    </span>
                  </div>

                  {/* Weapon */}
                  <div className="w-[120px] flex justify-center">
                    <WeaponIcon name={player.weapon} />
                  </div>

                  {/* Armor */}
                  <div className="w-[50px] flex justify-center">
                    <ShieldIcon type={player.armor} />
                  </div>

                  {/* Ultimate Points */}
                  <div className="w-[85px] flex justify-center">
                    <UltDots current={player.ultPoints} max={player.ultMax} />
                  </div>

                  {/* KDA */}
                  <div className="w-[85px] text-center font-mono text-xs text-gray-300 font-bold">
                    <span>{player.kills}</span>
                    <span className="text-gray-600 px-1">/</span>
                    <span>{player.deaths}</span>
                    <span className="text-gray-600 px-1">/</span>
                    <span>{player.assists}</span>
                  </div>

                  {/* Avatar & Player Name */}
                  <div className="flex items-center justify-end gap-3 w-[200px] text-right">
                    <div>
                      <span className="font-mono text-[9px] text-rose-400 block font-bold uppercase tracking-wider">
                        {player.agent}
                      </span>
                      <span className="font-bold text-xs text-white truncate block max-w-[140px]">
                        {player.name}
                      </span>
                    </div>
                    <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-gradient-to-br from-[#371c24] to-[#241217] border border-white/20 flex items-center justify-center font-mono text-xs font-black text-rose-400">
                      {player.agent.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
