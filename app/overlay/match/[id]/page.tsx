"use client";

import React, { useEffect, useState, use } from "react";
import { createClient } from "@supabase/supabase-js";

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

const STUB_TEAMS: Record<string, TeamMetadata> = {
  "team-zdc-01": { id: "team-zdc-01", name: "ZODIAC FIRE", tag: "ZDC", logo_url: "/branding/logo-icon.svg" },
  "team-tln-02": { id: "team-tln-02", name: "TALON ESPORTS", tag: "TLN", logo_url: null },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function MatchBroadcastOverlay({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = 'then' in params ? use(params) : params;
  const matchId = resolvedParams.id;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [games, setGames] = useState<MatchGame[]>([]);
  const [vetoes, setVetoes] = useState<MapVeto[]>([]);
  const [mvp, setMvp] = useState<MVPlayerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        const refinedMatch: MatchData = {
          ...matchData,
          team_a: teamAData || STUB_TEAMS["team-zdc-01"],
          team_b: teamBData || STUB_TEAMS["team-tln-02"],
        };

        setMatch(refinedMatch);

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
  const activeGame = games.find((g) => g.status === "LIVE") || games[games.length - 1];
  const mapName = activeGame?.map_name || "DECIDING_MAP";
  const isMatchPoint = rounds_won_a === 12 || rounds_won_b === 12;
  const isOvertime = rounds_won_a >= 12 && rounds_won_b >= 12;

  return (
    <main className="relative w-[1920px] h-[1080px] bg-transparent text-white overflow-hidden font-sans">
      {/* 1. TOP COMPACT SCOREBOARD CENTER */}
      {(status === "LIVE" || status === "PAUSED") && (
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
      {(status === "LIVE" || status === "PAUSED") && (
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

      {/* 3. MAP VETO OVERLAY */}
      {status === "VETO" && (
        <section className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md z-30 p-20">
          <div className="w-[1200px] bg-[#12121A]/80 border border-gray-800 rounded-2xl p-8 relative shadow-[0_0_50px_rgba(0,212,255,0.05)]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/40 to-transparent" />
            <div className="flex justify-between items-center border-b border-white/5 pb-6 mb-8">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF] tracking-wider uppercase font-bold">
                  BAN/PICK STAGE ACTIVE
                </span>
                <h2 className="text-3xl font-black text-white font-mono tracking-widest uppercase mt-2">
                  Map Veto Dashboard
                </h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500 font-mono">BO3 SERIES CONFIG</p>
                <p className="text-sm font-black text-[#C9A84C] font-mono mt-1">{team_a?.tag} VS {team_b?.tag}</p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-4 mb-8">
              {Array.from({ length: 7 }).map((_, index) => {
                const stepOrder = index + 1;
                const activeVeto = vetoes.find((v) => v.step_order === stepOrder);
                const isCurrent = stepOrder === vetoes.length + 1;

                return (
                  <div
                    key={stepOrder}
                    className={`rounded-xl border p-4 flex flex-col justify-between h-[180px] transition-all duration-300 ${
                      isCurrent
                        ? "border-[#C9A84C] bg-[#C9A84C]/5 shadow-[0_0_15px_rgba(201,168,76,0.15)]"
                        : activeVeto
                          ? "border-white/5 bg-[#0D0E1A]/40"
                          : "border-white/5 bg-transparent opacity-30"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-black text-gray-500">#{stepOrder}</span>
                      {activeVeto && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest ${
                            activeVeto.action === "BAN"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : activeVeto.action === "PICK"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                          }`}
                        >
                          {activeVeto.action}
                        </span>
                      )}
                    </div>

                    <div className="my-4 text-center">
                      <p className="font-mono text-sm font-bold text-white truncate">
                        {activeVeto ? activeVeto.map_name : isCurrent ? "WAITING..." : "—"}
                      </p>
                      <p className="font-mono text-[9px] text-gray-500 mt-1 uppercase">
                        {activeVeto?.team_id === team_a?.id ? team_a?.tag : activeVeto?.team_id === team_b?.id ? team_b?.tag : "DECIDER"}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-2 text-[9px] font-mono text-center">
                      {activeVeto?.was_auto ? (
                        <span className="text-amber-500/80 animate-pulse font-bold">⚠️ AUTO TIMEOUT</span>
                      ) : activeVeto ? (
                        <span className="text-neutral-500">SELECTION LOCKED</span>
                      ) : isCurrent ? (
                        <span className="text-[#C9A84C] animate-pulse font-bold">CHOOSING...</span>
                      ) : (
                        <span className="text-neutral-700">LOCKED</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. INTERMISSION & STATS TRANSITIONS */}
      {status === "AWAITING_RESULT" && (
        <section className="absolute inset-0 flex items-center justify-end bg-black/90 backdrop-blur-md z-30 p-20">
          <div className="flex gap-10 max-w-[1400px] w-full">
            <div className="flex-1 bg-[#12121A]/80 border border-gray-800 rounded-2xl p-8 relative shadow-2xl">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] tracking-wider uppercase font-bold">
                MAP SERIES RESULTS
              </span>
              <h2 className="text-2xl font-black text-white font-mono tracking-widest uppercase mt-2 mb-6">
                Match Intermission
              </h2>

              <div className="space-y-4">
                {games.map((g) => (
                  <div key={g.id} className="flex justify-between items-center bg-[#0D0E1A]/60 p-5 rounded-xl border border-white/5">
                    <div>
                      <p className="font-mono text-[10px] text-gray-500">MAP {g.game_number}</p>
                      <p className="font-mono text-lg font-black text-white">{g.map_name || "PENDING MAP"}</p>
                    </div>
                    <div className="flex items-center gap-6 font-mono">
                      <span className={`text-2xl font-black ${g.score_a > g.score_b ? "text-[#C9A84C]" : "text-neutral-500"}`}>
                        {g.score_a}
                      </span>
                      <span className="text-xs text-neutral-600">vs</span>
                      <span className={`text-2xl font-black ${g.score_b > g.score_a ? "text-[#C9A84C]" : "text-neutral-500"}`}>
                        {g.score_b}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {mvp && (
              <div className="w-[450px] bg-gradient-to-b from-[#12121A]/95 to-[#0A0A0F] border-2 border-[#C9A84C]/50 rounded-2xl p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF] tracking-wider uppercase font-bold">
                      MVP FOR CURRENT MAP
                    </span>
                    <span className="font-mono text-sm text-[#C9A84C] font-black">{mvp.team_tag}</span>
                  </div>

                  <div className="text-center my-6">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b1c2b] to-[#252740] border border-[#C9A84C]/30 text-white font-mono text-2xl font-black mb-3">
                      {mvp.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <h3 className="font-mono text-2xl font-black text-white uppercase tracking-wider">{mvp.display_name}</h3>
                    <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-1">AGENT: {mvp.agent_played}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 my-6">
                    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                      <p className="font-mono text-[9px] text-gray-500 uppercase">K / D / A</p>
                      <p className="font-mono text-sm font-black text-white mt-1">{mvp.kills}/{mvp.deaths}/{mvp.assists}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                      <p className="font-mono text-[9px] text-gray-500 uppercase">AVG ACS</p>
                      <p className="font-mono text-sm font-black text-[#00D4FF] mt-1">{mvp.acs}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
                      <p className="font-mono text-[9px] text-gray-500 uppercase">HS RATE</p>
                      <p className="font-mono text-sm font-black text-[#C9A84C] mt-1">{mvp.headshot_pct}%</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 text-center">
                  <span className="font-mono text-[9px] text-neutral-500 uppercase">ZODIAC ARENA PERFORMANCE ENGINE</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
