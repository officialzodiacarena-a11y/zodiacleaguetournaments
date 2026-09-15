"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Siren, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { claimMercySubSlot, getOpenMercyTickets, type OpenMercyTicket } from "@/lib/actions/match-room";

const supabase = createClient();

/**
 * Ringer-facing claim UI for open Mercy Sub Fill tickets (Patch V7.01 Fix 1.3
 * — claimMercySubSlot() existed as a Server Action but no component ever
 * called it). Pass `roomId` to scope the list to one Match Room page, or omit
 * it for a global feed (Dashboard).
 */
export function MercySubBeaconClaimWidget({ roomId }: { roomId?: string }) {
  const [tickets, setTickets] = useState<OpenMercyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; isError: boolean } | null>(null);

  const fetchTickets = useCallback(async () => {
    const res = await getOpenMercyTickets(roomId);
    if (res.success) setTickets((res.data as OpenMercyTicket[]) || []);
  }, [roomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    fetchTickets().finally(() => setLoading(false));

    const channel = supabase
      .channel("mercy-global-beacon")
      .on("broadcast", { event: "mercy_beacon_alert" }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  const handleClaim = async (ticket: OpenMercyTicket) => {
    setClaimingId(ticket.id);
    setFeedback(null);

    const res = await claimMercySubSlot(ticket.id);
    setClaimingId(null);

    if (res.success) {
      setFeedback({ id: ticket.id, msg: "🎉 CLAIMED! REDIRECTING TO MATCH ROOM...", isError: false });
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
      setTimeout(() => {
        window.location.href = `/tournaments/room/${ticket.roomId}`;
      }, 1200);
    } else {
      setFeedback({ id: ticket.id, msg: `❌ ${res.error || "SLOT_TAKEN"}`, isError: true });
      fetchTickets();
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-[#0D0E1A]/90 border border-white/10 rounded-2xl font-mono text-[10px] text-gray-500 text-center">
        <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
        SCANNING FOR MERCY BEACONS...
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="p-4 bg-[#0D0E1A]/90 border border-white/10 rounded-2xl font-mono text-[10px] text-gray-500 text-center">
        NO ACTIVE MERCY SUB BEACONS AT THE MOMENT
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#0D0E1A]/90 border border-rose-500/40 rounded-2xl space-y-3 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Siren className="w-4 h-4 text-rose-400 animate-pulse" />
        <h4 className="font-mono text-xs font-black text-rose-400 uppercase tracking-wider">
          Emergency Mercy Sub Calls
        </h4>
      </div>

      <div className="space-y-2">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{ticket.roomTitle}</p>
              <p className="text-[10px] font-mono text-gray-400">
                {ticket.missingTeamSide.replace("_", " ")} NEEDS{" "}
                <span className="text-[#E8B429] font-semibold">{ticket.requiredRole}</span>
              </p>
            </div>

            <button
              onClick={() => handleClaim(ticket)}
              disabled={claimingId === ticket.id}
              className="shrink-0 px-3 py-1.5 bg-rose-600 text-white font-bold text-[10px] font-mono uppercase rounded-lg hover:bg-rose-500 disabled:opacity-50 transition"
            >
              {claimingId === ticket.id ? "CLAIMING..." : "CLAIM SLOT"}
            </button>
          </div>
        ))}
      </div>

      {feedback && (
        <p className={`text-[10px] font-mono text-center ${feedback.isError ? "text-red-400" : "text-emerald-400"}`}>
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
