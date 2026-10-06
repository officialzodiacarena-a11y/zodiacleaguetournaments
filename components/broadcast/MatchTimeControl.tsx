"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// แผง ⏱️ Match Time Control — เส้นตายกดพร้อม · เลื่อนเวลานัด · Time out ในแผงเดียว
// ทุกปุ่มผ่าน API ของเซิร์ฟเวอร์ (PATCH /schedule · POST /timeout) ไม่เขียนฐานข้อมูลตรงจากเบราว์เซอร์

interface ActiveTimeoutView {
  type: "TACTICAL" | "TECHNICAL";
  team: "A" | "B" | null;
  reason: string | null;
  started_at: string;
  ends_at: string | null;
}

interface TimeoutView {
  status: string;
  current_game_number: number | null;
  overtime: boolean;
  tactical_limit: number;
  tactical_used: { A: number; B: number };
  active: ActiveTimeoutView | null;
}

interface LobbyView {
  scheduled_at: string | null;
  ready_deadline_at: string | null;
  status: string;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string } | string;
}

const POLL_MS = 5000;
const DELAY_OPTIONS = [15, 30, 60] as const;
const PRE_MATCH = ["SCHEDULED", "READY_CHECK"];
const IN_MATCH = ["LIVE", "PAUSED"];

function clock(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function countdown(deadline: string | null | undefined, nowMs: number): { text: string; passed: boolean } {
  if (!deadline) return { text: "--:--", passed: false };
  const diff = new Date(deadline).getTime() - nowMs;
  if (Number.isNaN(diff)) return { text: "--:--", passed: false };
  if (diff <= 0) return { text: "00:00", passed: true };
  const total = Math.floor(diff / 1000);
  return {
    text: `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
    passed: false,
  };
}

function two(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

function formatError(body: ApiErrorBody | null, fallback: string): string {
  const err = body?.error;
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return `${err.code ?? "ERROR"}: ${err.message ?? fallback}`;
}

export default function MatchTimeControl({
  matchId,
  teamATag,
  teamBTag,
}: {
  matchId: string;
  teamATag?: string | null;
  teamBTag?: string | null;
}) {
  const tagA = teamATag || "A";
  const tagB = teamBTag || "B";

  const [timeout, setTimeoutView] = useState<TimeoutView | null>(null);
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [delay, setDelay] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [technicalReason, setTechnicalReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoResumedFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/timeout`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setError(formatError(body, "โหลดสถานะคุมเวลาไม่สำเร็จ"));
        return;
      }
      setTimeoutView(body as TimeoutView);
      if (PRE_MATCH.includes((body as TimeoutView).status)) {
        const lobbyRes = await fetch(`/api/v1/matches/${matchId}/lobby`, { cache: "no-store" });
        if (lobbyRes.ok) setLobby((await lobbyRes.json()) as LobbyView);
      }
    } catch {
      setError("NETWORK_ERROR: การเชื่อมต่อขัดข้อง");
    }
  }, [matchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const callTimeout = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      setFeedback(null);
      try {
        const res = await fetch(`/api/v1/matches/${matchId}/timeout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok) setError(formatError(body, "ทำรายการไม่สำเร็จ"));
      } catch {
        setError("NETWORK_ERROR: การเชื่อมต่อขัดข้อง");
      } finally {
        setBusy(false);
        await load();
      }
    },
    [matchId, load],
  );

  const confirmReschedule = async () => {
    if (!delay) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delay_minutes: delay, reason: reason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(formatError(body, "เลื่อนเวลานัดไม่สำเร็จ"));
      } else {
        setFeedback(`เลื่อนเวลานัดเป็น ${clock((body as { scheduled_at: string }).scheduled_at)} แล้ว`);
        setDelay(null);
        setReason("");
      }
    } catch {
      setError("NETWORK_ERROR: การเชื่อมต่อขัดข้อง");
    } finally {
      setBusy(false);
      await load();
    }
  };

  const status = timeout?.status ?? "";
  const active = timeout?.active ?? null;
  const tacticalLeft = timeout
    ? {
        A: Math.max(0, timeout.tactical_limit - timeout.tactical_used.A),
        B: Math.max(0, timeout.tactical_limit - timeout.tactical_used.B),
      }
    : { A: 0, B: 0 };

  const activeSecondsLeft =
    active?.type === "TACTICAL" && active.ends_at
      ? Math.max(0, Math.ceil((new Date(active.ends_at).getTime() - nowMs) / 1000))
      : null;

  // Tactical นับถึง 0 ขณะยัง PAUSED → Resume เอง 1 ครั้งต่อ Time out (กันเรียกซ้ำ)
  useEffect(() => {
    if (status !== "PAUSED" || !active || active.type !== "TACTICAL" || activeSecondsLeft !== 0) return;
    if (autoResumedFor.current === active.started_at) return;
    autoResumedFor.current = active.started_at;
    void callTimeout({ action: "RESUME" });
  }, [status, active, activeSecondsLeft, callTimeout]);

  const readyDeadline = lobby?.ready_deadline_at ?? null;
  const cd = countdown(readyDeadline, nowMs);
  const reasonValid = reason.trim().length >= 3;
  const technicalValid = technicalReason.trim().length >= 3;
  const paused = status === "PAUSED";

  const btn =
    "w-full py-2 rounded font-mono text-[11px] font-bold transition uppercase border disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="mb-5 pb-5 border-b border-white/5">
      <h2 className="font-mono text-sm font-black text-amber-400 uppercase tracking-wider mb-3 border-b border-white/5 pb-2">
        ⏱️ Match Time Control
      </h2>

      {PRE_MATCH.includes(status) && (
        <div className="space-y-2 font-mono text-[11px] text-gray-300">
          <div data-testid="mtc-scheduled">Scheduled {clock(lobby?.scheduled_at)}</div>
          <div data-testid="mtc-deadline">Ready deadline {clock(readyDeadline)}</div>
          <div data-testid="mtc-countdown">
            Deadline countdown {cd.text}
            {cd.passed && <span className="ml-2 text-rose-400">หมดเวลา — รอระบบปรับแพ้</span>}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {DELAY_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`mtc-delay-${m}`}
                onClick={() => setDelay(m)}
                disabled={busy}
                className={`${btn} ${
                  delay === m
                    ? "bg-amber-500/25 border-amber-500/60 text-amber-300"
                    : "bg-neutral-800/50 border-white/10 text-gray-300 hover:bg-neutral-700/50"
                }`}
              >
                +{m} นาที
              </button>
            ))}
          </div>
          <input
            data-testid="mtc-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="เหตุผลที่เลื่อน (บังคับ)"
            className="w-full rounded bg-black/60 border border-white/10 px-2 py-1.5 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
          />
          <button
            type="button"
            data-testid="mtc-reschedule-confirm"
            onClick={confirmReschedule}
            disabled={busy || !delay || !reasonValid}
            className={`${btn} bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20`}
          >
            ยืนยันเลื่อนเวลานัด
          </button>
          {feedback && (
            <div data-testid="mtc-feedback" className="text-emerald-400">
              {feedback}
            </div>
          )}
        </div>
      )}

      {IN_MATCH.includes(status) && timeout && (
        <div className="space-y-2 font-mono text-[11px] text-gray-300">
          <div data-testid="mtc-quota">
            Tactical left · {tagA} {tacticalLeft.A}/{timeout.tactical_limit} · {tagB} {tacticalLeft.B}/{timeout.tactical_limit}
            {timeout.overtime ? " · OVERTIME" : ""}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="mtc-tactical-a"
              onClick={() => callTimeout({ action: "START", type: "TACTICAL", team: "A" })}
              disabled={busy || paused || tacticalLeft.A === 0}
              className={`${btn} bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20`}
            >
              Tactical Timeout · {tagA}
            </button>
            <button
              type="button"
              data-testid="mtc-tactical-b"
              onClick={() => callTimeout({ action: "START", type: "TACTICAL", team: "B" })}
              disabled={busy || paused || tacticalLeft.B === 0}
              className={`${btn} bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20`}
            >
              Tactical Timeout · {tagB}
            </button>
          </div>

          <input
            data-testid="mtc-technical-reason"
            value={technicalReason}
            onChange={(e) => setTechnicalReason(e.target.value)}
            maxLength={200}
            placeholder="เหตุผล Technical Pause (บังคับ)"
            className="w-full rounded bg-black/60 border border-white/10 px-2 py-1.5 text-[11px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
          />
          <button
            type="button"
            data-testid="mtc-technical"
            onClick={async () => {
              await callTimeout({ action: "START", type: "TECHNICAL", reason: technicalReason.trim() });
              setTechnicalReason("");
            }}
            disabled={busy || paused || !technicalValid}
            className={`${btn} bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20`}
          >
            Technical Pause
          </button>

          {paused && (
            <>
              <div data-testid="mtc-active" className="text-amber-300">
                {active?.type === "TACTICAL"
                  ? `TACTICAL TIMEOUT · ${active.team === "B" ? tagB : tagA} · ${two(activeSecondsLeft ?? 0)}`
                  : `TECHNICAL PAUSE · ${active?.reason ?? ""}`}
              </div>
              <button
                type="button"
                data-testid="mtc-resume"
                onClick={() => callTimeout({ action: "RESUME" })}
                disabled={busy}
                className={`${btn} bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20`}
              >
                ▶️ Resume
              </button>
            </>
          )}
        </div>
      )}

      {timeout && !PRE_MATCH.includes(status) && !IN_MATCH.includes(status) && (
        <div data-testid="mtc-idle" className="font-mono text-[11px] text-gray-500">
          ไม่มีรายการคุมเวลาในสถานะนี้
        </div>
      )}

      {error && (
        <div data-testid="mtc-error" className="mt-2 font-mono text-[11px] text-rose-400">
          {error}
        </div>
      )}
    </div>
  );
}
