"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { Shield, MessageSquare, UserCheck, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getRoomDetails, sendRoomMessage, triggerMercySubBeacon } from "@/lib/actions/match-room";
import { MercySubBeaconClaimWidget } from "@/components/dashboard/MercySubBeaconClaimWidget";
import { AthleteQuickPopover } from "@/components/profile/AthleteQuickPopover";

const supabase = createClient();

interface RoomParticipant {
  id: string;
  player_id: string;
  team_side: string;
  role_type: string;
  agent_role_preference: string | null;
  ap_staked: number;
  has_paid_escrow: boolean;
  is_ready_confirmed: boolean;
  is_mercy_ringer: boolean;
  players: { display_name: string } | null;
}

const AGENT_ROLES = ["DUELIST", "INITIATOR", "CONTROLLER", "SENTINEL", "FLEX"] as const;
type AgentRole = (typeof AGENT_ROLES)[number];

interface RoomStaffMember {
  id: string;
  staff_player_id: string;
  staff_role: string;
  is_active_monitoring: boolean;
}

interface RoomDetails {
  id: string;
  title: string;
  status: string;
  total_escrow_ap: number;
  mercy_beacon_active: boolean;
  match_room_participants: RoomParticipant[];
  match_room_staff: RoomStaffMember[];
}

interface ChatMessage {
  id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

export default function CustomMatchRoomPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = "then" in params ? use(params) : params;
  const roomId = resolvedParams.id;

  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [beaconRole, setBeaconRole] = useState<AgentRole>("FLEX");
  const [beaconBusy, setBeaconBusy] = useState(false);

  // Alis Flag 2: was a direct `supabase.from('match_rooms')...` call from this
  // client component — moved into the getRoomDetails() Server Action in
  // lib/actions/match-room.ts so the client never talks to the DB directly.
  const fetchRoomDetails = useCallback(async () => {
    const res = await getRoomDetails(roomId);
    if (res.success) setRoom(res.data as unknown as RoomDetails);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    fetchRoomDetails();

    const channel = supabase
      .channel(`scrim-room-${roomId}`)
      .on("broadcast", { event: "scrim_chat_message" }, (payload) => {
        setMessages((prev) => [...prev, payload.payload as ChatMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoomDetails]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const res = await sendRoomMessage({ roomId, message: chatInput });
    if (res.success) setChatInput("");
  };

  const handleMercyBeacon = async (side: "TEAM_A" | "TEAM_B", role: AgentRole) => {
    setBeaconBusy(true);
    await triggerMercySubBeacon({
      roomId,
      missingTeamSide: side,
      requiredRole: role,
    });
    setBeaconBusy(false);
    fetchRoomDetails();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center font-mono text-xs text-[#00D4FF]">
        [ LOADING TACTICAL SCRIM LOBBY HUD... ]
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white p-6 font-sans">
      {/* HEADER HUD BAR */}
      <header className="flex flex-wrap items-center justify-between border border-white/10 bg-[#0D0E1A]/80 backdrop-blur-xl p-5 rounded-2xl mb-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-[#E8B429]" />
            <span className="font-mono text-xs font-black text-[#E8B429] uppercase tracking-wider">
              TACTICAL SCRIM LOBBY
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white">{room?.title || "CUSTOM MATCH ROOM"}</h1>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          <div>
            <span className="text-gray-500 block text-[10px]">AP STAKE POOL</span>
            <span className="text-[#E8B429] font-black text-base">{room?.total_escrow_ap || 0} AP</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px]">STATUS</span>
            <span className="text-[#00D4FF] font-bold uppercase">{room?.status}</span>
          </div>
        </div>
      </header>

      {/* MAIN 12 PLAYER SLOTS & TACTICAL CHAT */}
      <div className="grid grid-cols-12 gap-6">
        {/* LEFT: 12 PLAYER SLOTS HUD & STAFF BOX (8 COLS) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-[#0D0E1A] border border-white/10 rounded-2xl p-6">
            <h2 className="font-mono text-sm font-black text-[#00D4FF] uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
              ROSTER SLOTS (12 CAPACITY)
            </h2>

            {/* Fix (Live Roster Sync, SPEC-MRP-FIX02): rosters below render from
                room.match_room_participants instead of a hardcoded [1..5] mock —
                scrims don't require a full 5v5 to proceed (3-2, 2-2 etc. are
                valid), so this must reflect the real headcount per side. */}
            <div className="flex items-center gap-2 mb-3 font-mono text-[10px]">
              <span className="text-gray-500 uppercase">ตำแหน่งที่จะขอ ringer:</span>
              <select
                value={beaconRole}
                onChange={(e) => setBeaconRole(e.target.value as AgentRole)}
                className="bg-black/60 border border-white/10 rounded px-2 py-1 text-white"
              >
                {AGENT_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(["TEAM_A", "TEAM_B"] as const).map((side) => {
                const roster = (room?.match_room_participants || []).filter((p) => p.team_side === side);
                const emptySlots = Math.max(0, 5 - roster.length);
                const headingClass = side === "TEAM_A" ? "text-emerald-400" : "text-rose-400";

                return (
                  <div key={side} className="space-y-2">
                    <h3 className={`font-mono text-xs font-bold ${headingClass}`}>
                      {side.replace("_", " ")} ({roster.length}/5)
                    </h3>

                    {roster.map((p) => (
                      <div key={p.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex justify-between items-center font-mono text-xs">
                        <span className="text-gray-200 truncate flex items-center gap-1">
                          <AthleteQuickPopover
                            playerId={p.player_id}
                            fallbackData={{
                              riotId: p.players?.display_name || p.player_id.slice(0, 8),
                              role: p.role_type || 'Unknown',
                              tierTitle: 'Unranked',
                              winRate: 0,
                              avgAcs: 0,
                              avgKd: 0,
                              avgAdr: 0,
                              headshotPct: 0
                            }}
                          >
                            <span className="cursor-pointer hover:text-[#00D4FF] transition-colors underline decoration-dashed decoration-gray-600 underline-offset-4">
                              {p.players?.display_name || p.player_id.slice(0, 8)}
                            </span>
                          </AthleteQuickPopover>
                          {p.is_mercy_ringer && <span className="text-rose-400 ml-1">[RINGER]</span>}
                        </span>
                        <span className={p.is_ready_confirmed ? "text-emerald-400 font-bold" : "text-yellow-400"}>
                          {p.is_ready_confirmed ? "READY ✓" : "PENDING"}
                        </span>
                      </div>
                    ))}

                    {Array.from({ length: emptySlots }).map((_, i) => (
                      <div key={`empty-${side}-${i}`} className="p-3 bg-black/20 border border-dashed border-white/10 rounded-xl flex justify-between items-center font-mono text-xs">
                        <span className="text-gray-600">EMPTY SLOT</span>
                        <button
                          onClick={() => handleMercyBeacon(side, beaconRole)}
                          disabled={beaconBusy}
                          className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded text-[10px] hover:bg-rose-500/30 disabled:opacity-50"
                        >
                          CALL RINGER
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* DEDICATED STAFF OVERSIGHT BOX */}
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="font-mono text-xs font-bold text-[#E8B429] mb-3 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> DEDICATED STAFF OVERSIGHT (REFEREES & OBSERVERS)
              </h3>
              <div className="flex gap-3">
                <div className="px-3 py-2 bg-[#E8B429]/10 border border-[#E8B429]/30 rounded-lg font-mono text-xs text-[#E8B429] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E8B429] animate-ping" />
                  REFEREE_ALICE (ACTIVE MONITORING)
                </div>
              </div>
            </div>
          </div>

          {/* Ringer Claim Feed — Patch V7.01 Fixes (SPEC-MRS-FIX04 §4.2) */}
          <MercySubBeaconClaimWidget roomId={roomId} />
        </div>

        {/* RIGHT: TACTICAL CHATBOX WITH GRANULAR PERMISSIONS (4 COLS) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-[#0D0E1A] border border-white/10 rounded-2xl p-5 h-[500px] flex flex-col justify-between">
            <div>
              <h2 className="font-mono text-xs font-black text-white uppercase tracking-wider mb-3 pb-2 border-b border-white/10 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00D4FF]" /> TACTICAL LOBBY CHAT
              </h2>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {messages.map((m, idx) => (
                  <div key={idx} className="p-2 bg-black/40 border border-white/5 rounded-lg font-mono text-xs">
                    <span className="text-[#00D4FF] font-bold">{m.sender_name}: </span>
                    <span className="text-gray-300">{m.message}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/10 pt-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type tactical message..."
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#00D4FF]"
              />
              <button onClick={handleSendMessage} className="p-2.5 bg-[#00D4FF] text-[#080810] rounded-xl font-bold">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
