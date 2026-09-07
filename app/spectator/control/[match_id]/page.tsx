"use client";

import React, { useEffect, useState, use } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

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
  | "CANCELLED";

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
  lobby_code?: string | null;
  team_a: TeamMetadata | null;
  team_b: TeamMetadata | null;
}

export interface StreamTelemetry {
  is_connected: boolean;
  current_fps: number;
  current_bitrate_kbps: number;
  health_status: "HEALTHY" | "UNSTABLE" | "CRITICAL" | "OFFLINE";
  connected_at: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SpectatorHUDControlPanel({
  params,
}: {
  params: Promise<{ match_id: string }> | { match_id: string };
}) {
  const resolvedParams = "then" in params ? use(params) : params;
  const matchId = resolvedParams.match_id;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [telemetry, setTelemetry] = useState<StreamTelemetry>({
    is_connected: false,
    current_fps: 0,
    current_bitrate_kbps: 0,
    health_status: "OFFLINE",
    connected_at: null,
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState<string>("LIVE");
  const [activeChannel, setActiveChannel] = useState<RealtimeChannel | null>(null);
  const [bannerType, setBannerType] = useState<string>("NORMAL");
  const [bannerMessage, setBannerMessage] = useState<string>("");
  const [lobbyCodeInput, setLobbyCodeInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "info" | "error"; msg: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        // 1. ตรวจสอบสิทธิ์ผู้ใช้งาน
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          if (isMounted) {
            setAuthorized(false);
            setLoading(false);
          }
          return;
        }

        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("player_id", user.id)
          .is("revoked_at", null)
          .single();

        const allowedRoles = ["REFEREE", "PRODUCER", "ADMIN", "SUPER_ADMIN"];
        if (roleError || !roleData || !allowedRoles.includes(roleData.role)) {
          if (isMounted) {
            setAuthorized(false);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setUserRole(roleData.role);
          setAuthorized(true);
        }

        // 2. ดึงข้อมูลแมตช์
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select(`
            id, tournament_id, stage_id, status, best_of, score_a, score_b, rounds_won_a, rounds_won_b, team_a_id, team_b_id, lobby_code,
            team_a:team_a_id ( id, name, tag, logo_url ),
            team_b:team_b_id ( id, name, tag, logo_url )
          `)
          .eq("id", matchId)
          .single();

        if (!matchError && matchData && isMounted) {
          const teamAObj = Array.isArray(matchData.team_a) ? matchData.team_a[0] : matchData.team_a;
          const teamBObj = Array.isArray(matchData.team_b) ? matchData.team_b[0] : matchData.team_b;

          setMatch({
            id: matchData.id,
            tournament_id: matchData.tournament_id,
            stage_id: matchData.stage_id,
            status: matchData.status as MatchStatus,
            best_of: matchData.best_of,
            score_a: matchData.score_a,
            score_b: matchData.score_b,
            rounds_won_a: matchData.rounds_won_a,
            rounds_won_b: matchData.rounds_won_b,
            team_a_id: matchData.team_a_id,
            team_b_id: matchData.team_b_id,
            lobby_code: matchData.lobby_code,
            team_a: teamAObj || null,
            team_b: teamBObj || null,
          });
        }

        // 3. ดึงข้อมูล Telemetry ของสตรีม
        const { data: streamData } = await supabase
          .from("streams")
          .select("id")
          .eq("match_id", matchId)
          .single();

        if (streamData && isMounted) {
          const { data: sessionData } = await supabase
            .from("stream_sessions")
            .select("is_connected, current_fps, current_bitrate_kbps, health_status, connected_at")
            .eq("stream_id", streamData.id)
            .single();

          if (sessionData && isMounted) {
            setTelemetry({
              is_connected: sessionData.is_connected,
              current_fps: sessionData.current_fps || 0,
              current_bitrate_kbps: sessionData.current_bitrate_kbps || 0,
              health_status: sessionData.health_status as StreamTelemetry["health_status"],
              connected_at: sessionData.connected_at,
            });
          }
        }
      } catch {
        // เงียบไว้เพื่อเสถียรภาพ
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInitialData();

    // 4. เชื่อมต่อ Realtime Broadcast Channel
    const channelName = `match-realtime-${matchId}`;
    const channel = supabase.channel(channelName);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && isMounted) {
        setActiveChannel(channel);
      }
    });

    const intervalId = setInterval(loadInitialData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const changeLiveScene = (sceneName: "VETO" | "LIVE" | "AWAITING_RESULT") => {
    if (!activeChannel) {
      setFeedback({ type: "error", msg: "สัญญาณเซิร์ฟเวอร์เรียลไทม์ออฟไลน์ กรุณาลองใหม่" });
      return;
    }

    activeChannel.send({
      type: "broadcast",
      event: "scene_change",
      payload: { scene: sceneName },
    });

    setCurrentScene(sceneName);
    setFeedback({ type: "info", msg: `สับเปลี่ยนหน้าจอ OBS Overlay เป็น [ ${sceneName} ] สำเร็จ` });
  };

  const dispatchHUDNotification = () => {
    if (!activeChannel) return;

    activeChannel.send({
      type: "broadcast",
      event: "hud_notification",
      payload: {
        type: bannerType,
        message: bannerMessage,
      },
    });

    setFeedback({ type: "info", msg: "ส่งกล่องข้อความ HUD แบนเนอร์เร่งด่วนสู่ OBS เรียบร้อยแล้ว" });
  };

  const clearHUDNotification = () => {
    if (!activeChannel) return;

    activeChannel.send({
      type: "broadcast",
      event: "hud_notification_clear",
      payload: {},
    });

    setBannerMessage("");
    setFeedback({ type: "info", msg: "ทำการล้างกล่อง HUD บน OBS เป็นช่องสัญญาณโปร่งแสงสำเร็จ" });
  };

  const updateMatchDatabaseStatus = async (targetStatus: MatchStatus) => {
    try {
      const { error } = await supabase
        .from("matches")
        .update({ status: targetStatus })
        .eq("id", matchId);

      if (error) {
        setFeedback({ type: "error", msg: `ไม่สามารถสลับสถานะ: ${error.message}` });
      } else {
        setFeedback({ type: "info", msg: `เปลี่ยนสถานะการจัดงานเป็น [ ${targetStatus} ] เรียบร้อย` });
        setMatch((prev) => (prev ? { ...prev, status: targetStatus } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "การทำธุรกรรมล้มเหลว";
      setFeedback({ type: "error", msg });
    }
  };

  const updateLobbyRoomCode = async () => {
    if (!lobbyCodeInput.trim()) return;
    try {
      const { error } = await supabase
        .from("matches")
        .update({ lobby_code: lobbyCodeInput })
        .eq("id", matchId);

      if (error) {
        setFeedback({ type: "error", msg: `บันทึกรหัสห้องแข่งล้มเหลว: ${error.message}` });
      } else {
        setFeedback({ type: "info", msg: `อัปเดตรหัสห้องแข่งเป็น [ ${lobbyCodeInput} ] สำเร็จ` });
        setMatch((prev) => (prev ? { ...prev, lobby_code: lobbyCodeInput } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "การประมวลผลเครือข่ายล้มเหลว";
      setFeedback({ type: "error", msg });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0F] font-mono text-xs font-bold text-[#00D4FF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00D4FF] border-t-transparent" />
          <span>[ LOADING ZODIAC SPECTATOR CONTROL PLATFORM SIGNAL... ]</span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0A0F] font-mono text-xs font-bold text-rose-500">
        <div className="border border-rose-500/20 bg-rose-500/5 p-8 rounded-xl uppercase tracking-widest text-center max-w-md">
          <p className="mb-2 text-xl">🚨 ACCESS DENIED (403)</p>
          <p className="text-gray-500">บัญชีของคุณไม่มีสิทธิ์ในการควบคุมคู่แข่งขันนี้ สิทธิ์จำกัดเฉพาะ Referee, Producer หรือแอดมินระบบของสมาคมเท่านั้น</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans p-6 relative">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent" />

      {/* HEADER BAR */}
      <header className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
        <div>
          <span className="font-mono text-[9px] px-2 py-0.5 border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C] font-black rounded uppercase">
            {userRole} MODE ACTIVE
          </span>
          <h1 className="text-xl font-mono font-black tracking-widest text-white uppercase mt-1">
            Spectator HUD Control Center
          </h1>
        </div>
        <div className="text-right font-mono text-xs">
          <span className="text-gray-500">MATCH STATUS: </span>
          <span className="font-bold text-[#00D4FF]">{match?.status}</span>
        </div>
      </header>

      {/* FEEDBACK STATUS BAR */}
      {feedback && (
        <div
          onClick={() => setFeedback(null)}
          className={`cursor-pointer mb-6 p-3 rounded font-mono text-xs border ${
            feedback.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          }`}
        >
          {feedback.type === "error" ? "🚨 " : "🟢 "} {feedback.msg}
          <span className="float-right text-gray-500">[ CLICK TO DISMISS ]</span>
        </div>
      )}

      {/* MAIN CONTROL GRID */}
      <div className="grid grid-cols-12 gap-6">
        {/* PANEL A: TELEMETRY & ROOM CONFIG */}
        <section className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-[#12121A] border border-white/5 rounded-xl p-5 relative overflow-hidden">
            <h2 className="font-mono text-sm font-black text-[#00D4FF] uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
              📊 Stream Telemetry Status
            </h2>
            <div className="space-y-4 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">INGEST SIGNAL:</span>
                <span className={`font-bold ${telemetry.is_connected ? "text-emerald-400" : "text-rose-500"}`}>
                  {telemetry.is_connected ? "🟢 ONLINE" : "🔴 OFFLINE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">HEALTH STATUS:</span>
                <span
                  className={`font-bold ${
                    telemetry.health_status === "HEALTHY"
                      ? "text-emerald-400"
                      : telemetry.health_status === "UNSTABLE"
                        ? "text-amber-400 animate-pulse"
                        : "text-rose-500"
                  }`}
                >
                  {telemetry.health_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">FRAME SPEED:</span>
                <span className="text-white font-bold">{telemetry.current_fps} FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">INGEST BITRATE:</span>
                <span className="text-white font-bold">
                  {telemetry.current_bitrate_kbps > 0
                    ? `${(telemetry.current_bitrate_kbps / 1000).toFixed(2)} Mbps`
                    : "0.00 Mbps"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#12121A] border border-white/5 rounded-xl p-5">
            <h2 className="font-mono text-sm font-black text-[#00D4FF] uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
              🔑 Match Room Config
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-gray-500 uppercase mb-1.5">
                  Lobby Room Code (Valorant Room Code)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lobbyCodeInput}
                    onChange={(e) => setLobbyCodeInput(e.target.value.toUpperCase())}
                    placeholder={match?.lobby_code || "ZA-KEY-99"}
                    className="flex-1 bg-black/60 border border-white/10 rounded px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-[#00D4FF] uppercase"
                  />
                  <button
                    onClick={updateLobbyRoomCode}
                    className="px-3 py-1.5 bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/20 rounded font-mono text-xs transition"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL B: OBS OVERLAY SCENE CONTROLLER */}
        <section className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-[#12121A] border border-white/5 rounded-xl p-5 relative">
            <h2 className="font-mono text-sm font-black text-[#C9A84C] uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
              🎬 OBS Overlay Scene Switcher
            </h2>
            <p className="font-mono text-[10px] text-gray-500 mb-4 leading-relaxed uppercase">
              * สลับเลย์เอาต์หน้าจอ OBS Overlay แบบเรียลไทม์โดยไม่เพิ่มภาระเขียนฐานข้อมูล
            </p>

            <div className="grid grid-cols-3 gap-3">
              {(["VETO", "LIVE", "AWAITING_RESULT"] as const).map((scene) => (
                <button
                  key={scene}
                  onClick={() => changeLiveScene(scene)}
                  className={`py-3 px-2 rounded-lg font-mono text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                    currentScene === scene
                      ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C] shadow-[0_0_15px_rgba(201,168,76,0.15)]"
                      : "bg-black/40 border-white/5 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="text-[10px]">SCENE</span>
                  <span>{scene}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#12121A] border border-white/5 rounded-xl p-5">
            <h2 className="font-mono text-sm font-black text-[#C9A84C] uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
              📣 On-Screen HUD Notification
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(["NORMAL", "MATCH_POINT", "PAUSE"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setBannerType(type)}
                    className={`py-1.5 px-2 rounded border font-mono text-[9px] font-bold tracking-wider transition ${
                      bannerType === type
                        ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]"
                        : "bg-black/30 border-white/5 text-gray-500 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-mono text-[10px] text-gray-500 uppercase mb-1.5">
                  HUD Alert Message Context
                </label>
                <textarea
                  value={bannerMessage}
                  onChange={(e) => setBannerMessage(e.target.value)}
                  placeholder="เช่น TECHNICAL PAUSE - ตรวจสอบอุปกรณ์หูฟังนักกีฬา"
                  className="w-full h-[60px] bg-black/60 border border-white/10 rounded p-2.5 font-mono text-xs focus:outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={dispatchHUDNotification}
                  className="flex-1 py-2 bg-[#C9A84C]/15 border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/25 rounded font-mono text-xs font-bold transition uppercase"
                >
                  🚀 Dispatch Banner
                </button>
                <button
                  onClick={clearHUDNotification}
                  className="py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded font-mono text-xs transition"
                >
                  CLEAR
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL C: TOURNAMENT LIFE-CYCLE & MATCH STATE MACHINE */}
        <section className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-[#12121A] border border-white/5 rounded-xl p-5 h-full flex flex-col justify-between">
            <div>
              <h2 className="font-mono text-sm font-black text-rose-500 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                ⚠️ Match State Machine
              </h2>
              <p className="font-mono text-[10px] text-gray-500 mb-4 leading-relaxed uppercase">
                * สิทธิ์การใช้งานปุ่มจำกัดเฉพาะ Referee / Producer / Admin เท่านั้น
              </p>

              <div className="space-y-2.5">
                {match?.status === "LIVE" ? (
                  <button
                    onClick={() => updateMatchDatabaseStatus("PAUSED")}
                    className="w-full py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 rounded font-mono text-xs font-bold transition uppercase"
                  >
                    ⏸️ Pause Match
                  </button>
                ) : match?.status === "PAUSED" ? (
                  <button
                    onClick={() => updateMatchDatabaseStatus("LIVE")}
                    className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 rounded font-mono text-xs font-bold transition uppercase"
                  >
                    ▶️ Resume Match
                  </button>
                ) : (
                  <button
                    onClick={() => updateMatchDatabaseStatus("LIVE")}
                    className="w-full py-2.5 bg-neutral-800/50 border border-white/5 text-gray-500 cursor-not-allowed rounded font-mono text-xs transition"
                    disabled
                  >
                    Match Pause Locked
                  </button>
                )}

                <button
                  onClick={() => updateMatchDatabaseStatus("AWAITING_RESULT")}
                  className="w-full py-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 rounded font-mono text-[11px] font-bold transition uppercase"
                >
                  🏁 Set Awaiting Result
                </button>

                <button
                  onClick={() => updateMatchDatabaseStatus("COMPLETED")}
                  className="w-full py-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 rounded font-mono text-[11px] font-bold transition uppercase"
                >
                  🏆 Complete Series
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 mt-6">
              <span className="font-mono text-[9px] text-neutral-600 block text-center uppercase">
                ZODIAC BROADCAST CONTROL SYSTEM v1.2
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
