"use client";

import React, { useEffect, useRef, useState, use } from "react";
import { createClient } from "@supabase/supabase-js";
import { VetoScene } from "@/components/overlay/VetoScene";
import { IntermissionScene } from "@/components/overlay/IntermissionScene";
import { BuyPhaseHud, type BuyPhasePlayer } from "@/components/overlay/BuyPhaseHud";
import { LiveRosterSidebar } from "@/components/overlay/LiveRosterSidebar";
import { LiveScoreboard } from "@/components/overlay/LiveScoreboard";
import { resolveDisplayScene } from "@/lib/overlay/series-flow";
import { currentDeadlineMs, parseVetoFormat, vetoStartMsFromMatch, type VetoConfig } from "@/lib/veto/engine";
import { SponsorBadge } from "@/components/overlay/SponsorBadge";
import { buildSeriesGames, countSeriesWins, isGameDone, type OverlayGameStats, type OverlayParticipantStat } from "@/components/overlay/series";

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
  format_config?: Record<string, unknown> | null;
  winner_team_id?: string | null;
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
  created_at?: string | null;
  deadline_at?: string | null;
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon";
const supabase = createClient(supabaseUrl, supabaseAnonKey);


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
  const [rosterA, setRosterA] = useState<BuyPhasePlayer[]>([]);
  const [rosterB, setRosterB] = useState<BuyPhasePlayer[]>([]);
  const [tournamentName, setTournamentName] = useState<string | null>(null);
  const [stageName, setStageName] = useState<string | null>(null);
  const [vetoConfig, setVetoConfig] = useState<VetoConfig>(() => parseVetoFormat(null));
  const [seriesStats, setSeriesStats] = useState<OverlayGameStats[]>([]);
  const statusRef = useRef<MatchStatus | null>(null);

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

  // Veto heartbeat: ระหว่างสถานะ VETO เรียกระบบเติมสเต็ปที่หมดเวลา (Auto-pick) และ DECIDER ทุก ~5 วินาที
  // (Vercel Hobby ตั้ง cron ถี่ระดับวินาทีไม่ได้; ผลลัพธ์ถูกกำหนดจากเวลา + veto_format จึงเรียกซ้ำได้ปลอดภัย)
  const isVetoStatus = match?.status === "VETO";
  useEffect(() => {
    if (!isVetoStatus) return;
    const tick = () => {
      fetch(`/api/v1/matches/${matchId}/veto/tick`, { method: "POST" }).catch(() => undefined);
    };
    tick();
    const timer = setInterval(tick, 5000);
    return () => clearInterval(timer);
  }, [isVetoStatus, matchId]);

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
        statusRef.current = refinedMatch.status;

        // ชื่อทัวร์นาเมนต์ / Stage สำหรับแถบรายละเอียดแมตช์ (ดึงแยก: ถ้าพลาดจะแสดง "—" และไม่กระทบ Overlay)
        try {
          const [tournamentRes, stageRes] = await Promise.all([
            matchData.tournament_id
              ? supabase.from("tournaments").select("name").eq("id", matchData.tournament_id).maybeSingle()
              : Promise.resolve({ data: null }),
            matchData.stage_id
              ? supabase.from("tournament_stages").select("name, veto_format").eq("id", matchData.stage_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          if (isMounted) {
            setTournamentName(tournamentRes.data?.name ?? null);
            setStageName(stageRes.data?.name ?? null);
            setVetoConfig(parseVetoFormat((stageRes.data as { veto_format?: unknown } | null)?.veto_format ?? null));
          }
        } catch (nameErr) {
          console.error("Failed to fetch tournament/stage names:", nameErr);
        }

        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('id, team_id, players!team_members_player_id_fkey(display_name)')
          .eq('status', 'ACTIVE')
          .in('team_id', [teamAData.id, teamBData.id]);

        if (teamMembers) {
          const toRoster = (teamId: string) =>
            teamMembers
              .filter((m) => m.team_id === teamId)
              .map((m) => ({
                id: m.id,
                name:
                  (Array.isArray(m.players) ? m.players[0]?.display_name : (m.players as { display_name?: string } | null)?.display_name) ||
                  "Unknown",
                kills: 0,
                deaths: 0,
                assists: 0,
              }));
          const newRosterA = toRoster(teamAData.id);
          const newRosterB = toRoster(teamBData.id);
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
              // สถิติผู้เล่นรายเกมทั้งหมด ใช้สรุปรวมทั้งซีรีส์บนฉากแมตช์จบ
              setSeriesStats(
                (partJson.games as Array<{ game_number: number; map_name: string | null; participants?: OverlayParticipantStat[] }>).map((g) => ({
                  game_number: g.game_number,
                  map_name: g.map_name,
                  participants: g.participants ?? [],
                }))
              );
              const latestGame = partJson.games[partJson.games.length - 1];
              const parts = latestGame.participants || [];
              const teamAParts = parts.filter((p: { team_id: string }) => p.team_id === teamAData.id);
              const teamBParts = parts.filter((p: { team_id: string }) => p.team_id === teamBData.id);

              type PartRow = { player_id: string; display_name: string | null; agent_played: string | null; kills: number; deaths: number; assists: number };
              const toPartRoster = (rows: PartRow[], prefix: string): BuyPhasePlayer[] =>
                rows.map((p, idx) => ({
                  id: p.player_id || `${prefix}-${idx}`,
                  name: p.display_name || `Player ${idx + 1}`,
                  agent: p.agent_played || undefined,
                  kills: p.kills ?? 0,
                  deaths: p.deaths ?? 0,
                  assists: p.assists ?? 0,
                }));

              if (teamAParts.length > 0) setRosterA(toPartRoster(teamAParts, "a"));
              if (teamBParts.length > 0) setRosterB(toPartRoster(teamBParts, "b"));
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
          // สกอร์รอบ/ผู้ชนะเปลี่ยน (สถานะเดิม): อัปเดตทันทีจาก payload โดยไม่รีเซ็ตฉากที่แอดมินสลับไว้ และไม่ดึงข้อมูลใหม่ทั้งหมด
          if (updatedMatch.status && updatedMatch.status !== statusRef.current) {
            statusRef.current = updatedMatch.status;
            setBroadcastScene(null);
            fetchInitialData();
          }
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
  // ฉากที่แสดง: Broadcast จากผู้คุม (ทันที) → ฉากที่จำไว้ใน DB (ช่วงแข่ง, ตรงกับจำนวนเกมที่จบ) → สถานะแมตช์
  // ระหว่างซีรีส์ BO3/BO5 สถานะแมตช์ยังเป็น LIVE (DB ไม่ให้ AWAITING_RESULT กลับเป็น LIVE) จึงต้องจำฉากไว้ให้ OBS ที่รีเฟรชกลางเกม
  const completedGames = games.filter((g) => isGameDone(g)).length;
  const displayStatus = resolveDisplayScene({ status, broadcastScene, formatConfig: match.format_config, completedGames });
  const showScoreboard = displayStatus === "LIVE" || status === "PAUSED";
  // แมพที่กำลังแข่ง: match_games ถูกสร้างเมื่อเกมจบเท่านั้น จึงหาจากลำดับ Veto (PICK/DECIDER) — เกมที่ LIVE ก่อน ถ้าไม่มีใช้เกมถัดไปที่ยังไม่จบ
  const { totalGames, seriesGames, nextGameNumber } = buildSeriesGames(match.best_of ?? 3, vetoes, games);
  const liveGame = seriesGames.find((g) => g.gameStatus === "LIVE") ?? seriesGames.find((g) => g.gameNumber === nextGameNumber);
  const mapLabel = liveGame ? `MAP ${liveGame.gameNumber}` : "MAP";
  const mapName = liveGame?.mapName ? liveGame.mapName.toUpperCase() : null;
  // สกอร์ซีรีส์นับจากเกมที่จบแล้ว (matches.score_a/score_b ถูกเขียนตอนแมตช์จบเท่านั้น)
  const seriesWins = team_a && team_b ? countSeriesWins(team_a, team_b, games) : { winsA: 0, winsB: 0 };
  const winsNeeded = Math.floor(totalGames / 2) + 1;
  const isMatchPoint = rounds_won_a === 12 || rounds_won_b === 12;
  const isOvertime = rounds_won_a >= 12 && rounds_won_b >= 12;

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
      {showScoreboard && team_a && team_b && (
        <LiveScoreboard
          teamA={team_a}
          teamB={team_b}
          winsNeeded={winsNeeded}
          winsA={seriesWins.winsA}
          winsB={seriesWins.winsB}
          roundsA={rounds_won_a}
          roundsB={rounds_won_b}
          mapLabel={mapLabel}
          mapName={mapName}
        />
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

      
      {/* SPONSOR BADGE (Title Sponsor จริงจาก banners API แทน placeholder เดิม) */}
      {showScoreboard && (
        <section className="absolute bottom-8 left-8 z-40">
          <SponsorBadge />
        </section>
      )}

      {/* PLAYER SIDEBARS: ชื่อผู้เล่นจริงจาก team_members / participants (ไม่มีข้อมูล HP จริง จึงไม่แสดง) */}
      {showScoreboard && <LiveRosterSidebar roster={rosterA} side="left" team="A" />}
      {showScoreboard && <LiveRosterSidebar roster={rosterB} side="right" team="B" />}

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
          steps={vetoConfig.steps}
          deadlineMs={status === "VETO" ? currentDeadlineMs(vetoConfig, vetoes, vetoStartMsFromMatch({ team_a_ready_at: match.team_a_ready_at, team_b_ready_at: match.team_b_ready_at, updated_at: (match as { updated_at?: string }).updated_at ?? new Date(0).toISOString() })) : null}
        />
      )}

      {/* 4. INTERMISSION (AWAITING_RESULT) & FINAL RESULT (COMPLETED): Sponsor Towers + Series Score + All Games + MVP */}
      {(displayStatus === "AWAITING_RESULT" || displayStatus === "COMPLETED") && team_a && team_b && (
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
          isFinal={displayStatus === "COMPLETED"}
          winnerTeamId={match.winner_team_id ?? null}
          fallbackScoreA={score_a ?? 0}
          fallbackScoreB={score_b ?? 0}
          stats={seriesStats}
        />
      )}

      {/* 5. BUY PHASE HUD (TOGGLED VIA ALT+C OR REALTIME BROADCAST) — แสดงเฉพาะข้อมูลที่มีจริง */}
      <BuyPhaseHud visible={showBuyPhase} teamA={team_a} teamB={team_b} rosterA={rosterA} rosterB={rosterB} />
    </main>
  );
}
