"use client";

import React, { useState } from "react";
import { Shield, Zap, Filter, Crosshair, ArrowRight, RefreshCw, Lock, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { createScheduledMatchRoom } from "@/lib/actions/match-room";

const PROFANITY_LIST = ["fuck", "shit", "bitch", "asshole", "ควย", "สัส", "เหี้ย", "หี", "แตด"];
const checkProfanity = (text: string) => {
  return PROFANITY_LIST.some(word => text.toLowerCase().includes(word));
};

export function QuickScrimFlipCard() {
  const router = useRouter();
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [roomName, setRoomName] = useState("TACTICAL SCRIM 5v5");
  const [role, setRole] = useState<"DUELIST" | "INITIATOR" | "CONTROLLER" | "SENTINEL" | "FLEX">("DUELIST");
  const [apStake, setApStake] = useState<number>(100);
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCreateClick = () => {
    if (checkProfanity(roomName)) {
      setFeedback("⚠️ Room name contains profanity!");
      return;
    }
    if (isPrivate && passcode.length < 4) {
      setFeedback("⚠️ Passcode must be at least 4 characters");
      return;
    }
    setFeedback(null);
    setShowConfirmModal(true);
  };

  const handleConfirmCreate = async () => {
    setLoading(true);
    setFeedback(null);
    setShowConfirmModal(false);

    // Schedule 2 Hours from Now
    const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const res = await createScheduledMatchRoom({
      title: `${roomName} [${role}]`,
      scheduledAt: scheduledTime,
      minApStake: apStake,
      targetTierMin: "GOLD",
      targetTierMax: "RADIANT",
      matchMode: "SCRIM_5V5",
      isPrivate: isPrivate,
      passcode: isPrivate ? passcode : undefined,
    });

    setLoading(false);

    if (res.success) {
      setFeedback("✅ SCRIM ROOM CREATED! REDIRECTING...");
      const roomId = (res.data as unknown as { room_id?: string })?.room_id;
      if (roomId) {
        router.push(`/tournaments/room/${roomId}`);
      } else {
        router.push('/tournaments');
      }
    } else {
      setFeedback(`❌ ${res.error}`);
    }
  };

  return (
    <>
      <div className="w-full max-w-md h-[400px] [perspective:1000px] font-sans">
        <div
          className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* FRONT FACE: MERCY POOL STATUS */}
          <div className="absolute inset-0 w-full h-full bg-[#0D0E1A]/90 border border-[#E8B429]/30 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between [backface-visibility:hidden] shadow-[0_0_30px_rgba(232,180,41,0.1)]">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#E8B429]" />
                  <span className="font-mono text-xs font-black text-white uppercase tracking-wider">
                    MERCY SCRIM POOL
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                  ACTIVE QUEUE
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-white/5">
                  <span className="text-gray-400">ACTIVE SCRIM ROOMS:</span>
                  <span className="text-[#00D4FF] font-bold">14 ROOMS</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-white/5">
                  <span className="text-gray-400">ON-CALL RINGERS:</span>
                  <span className="text-[#E8B429] font-bold">38 ATHLETES</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full py-3 bg-gradient-to-r from-[#E8B429] to-[#F59E0B] text-[#080810] rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(232,180,41,0.3)]"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>FIND 5v5 SCRIM / QUICK QUEUE</span>
              </button>

              <button
                onClick={() => setIsFlipped(true)}
                className="w-full py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 rounded-xl font-mono text-[11px] uppercase tracking-wider transition flex items-center justify-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-[#00D4FF]" />
                <span>BEACON FOR SUB / ADVANCED FILTERS</span>
              </button>
            </div>
          </div>

          {/* BACK FACE: QUICK FILTERS & CREATE ROOM */}
          <div className="absolute inset-0 w-full h-full bg-[#0D0E1A]/95 border border-[#00D4FF]/40 backdrop-blur-xl rounded-2xl p-6 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-[0_0_30px_rgba(0,212,255,0.15)] overflow-y-auto custom-scrollbar">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 sticky top-0 bg-[#0D0E1A]/95 z-10">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-[#00D4FF]" />
                  <span className="font-mono text-xs font-black text-white uppercase tracking-wider">
                    QUICK SCRIM SETUP
                  </span>
                </div>
                <button
                  onClick={() => setIsFlipped(false)}
                  className="text-gray-400 hover:text-white font-mono text-[10px] uppercase flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> FLIP
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] text-gray-400 uppercase mb-1">
                    ROOM NAME
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#00D4FF]"
                    maxLength={32}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 p-2 bg-black/40 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    {isPrivate ? <Lock className="w-4 h-4 text-red-400" /> : <Globe className="w-4 h-4 text-green-400" />}
                    <span className="font-mono text-[10px] text-gray-300">
                      {isPrivate ? "PRIVATE ROOM" : "PUBLIC ROOM"}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className="text-[10px] font-bold text-[#00D4FF] hover:underline"
                  >
                    TOGGLE
                  </button>
                </div>

                {isPrivate && (
                  <div>
                    <label className="block font-mono text-[10px] text-gray-400 uppercase mb-1">
                      PASSCODE
                    </label>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full bg-black/60 border border-red-500/30 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-red-500"
                      placeholder="Enter 4-digit code"
                      maxLength={16}
                    />
                  </div>
                )}

                <div>
                  <label className="block font-mono text-[10px] text-gray-400 uppercase mb-1">
                    PREFERRED AGENT ROLE
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["DUELIST", "INITIATOR", "CONTROLLER", "SENTINEL", "FLEX"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`py-1.5 rounded font-mono text-[9px] font-bold border transition ${
                          role === r
                            ? "bg-[#00D4FF]/20 border-[#00D4FF] text-[#00D4FF]"
                            : "bg-black/40 border-white/5 text-gray-500 hover:text-white"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-gray-400 uppercase mb-1">
                    AP STAKE PER PLAYER ({apStake} AP)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={apStake}
                    onChange={(e) => setApStake(Number(e.target.value))}
                    className="w-full accent-[#E8B429] bg-black/60 rounded"
                  />
                </div>

                {feedback && (
                  <div className="p-2 bg-black/60 border border-white/10 rounded font-mono text-[10px] text-center text-[#E8B429]">
                    {feedback}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateClick}
              disabled={loading}
              className="w-full mt-4 py-3 bg-[#00D4FF] text-[#080810] rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition flex items-center justify-center gap-2"
            >
              {loading ? "PROCESSING..." : "CONFIRM & CREATE ROOM"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL (CyberpunkConfirmModal spec) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0D0E1A] border border-[#00D4FF]/50 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(0,212,255,0.2)]">
            <div className="p-6">
              <h3 className="text-[#00D4FF] font-black text-lg tracking-wider mb-2">CREATE ROOM?</h3>
              <p className="text-gray-400 text-sm font-mono mb-6">
                You are about to create a {isPrivate ? "PRIVATE" : "PUBLIC"} room 
                &quot;{roomName}&quot; with an AP stake of {apStake} AP.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 text-gray-300 font-mono text-xs hover:bg-white/5 transition"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmCreate}
                  className="flex-1 py-2.5 rounded-lg bg-[#00D4FF] text-[#080810] font-black tracking-wider text-xs hover:brightness-110 transition"
                >
                  INITIALIZE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
