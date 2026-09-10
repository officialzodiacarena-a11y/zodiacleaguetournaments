'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// UI/UX Spec status: Pending Prototype — see PredictionPoolCard.tsx note.
// Q4 Critical: next_reset_at comes ONLY from the server response — this
// component never computes it locally.

const HEARTBEAT_INTERVAL_MS = 60_000;

interface WatchAPTrackerProps {
  sessionId: string;
}

type ConnState = 'ok' | 'grace' | 'disconnected';

export function WatchAPTracker({ sessionId }: WatchAPTrackerProps) {
  const [totalToday, setTotalToday] = useState(0);
  const [dailyCap, setDailyCap] = useState(100);
  const [capReached, setCapReached] = useState(false);
  const [nextResetAt, setNextResetAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [connState, setConnState] = useState<ConnState>('ok');
  const [earning, setEarning] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuccessRef = useRef<number>(0);

  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/watch/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setConnState('disconnected');
        return;
      }

      lastSuccessRef.current = Date.now();
      setConnState('ok');
      setTotalToday(json.total_today);
      setDailyCap(json.daily_cap);

      if (json.status === 'CAP_REACHED') {
        // Q4: clearInterval immediately, show CapReachedBadge, resume at next_reset_at.
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setCapReached(true);
        setNextResetAt(json.next_reset_at);
        return;
      }

      setEarning(json.earned > 0);
      setTimeout(() => setEarning(false), 800);
    } catch {
      setConnState('disconnected');
    }
  }, [sessionId]);

  useEffect(() => {
    lastSuccessRef.current = Date.now();
    timerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    void Promise.resolve().then(sendHeartbeat);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [sendHeartbeat]);

  // Grace period / disconnected indicator based on time since last successful heartbeat.
  useEffect(() => {
    const check = setInterval(() => {
      if (capReached) return;
      const secondsSince = (Date.now() - lastSuccessRef.current) / 1000;
      if (secondsSince > HEARTBEAT_INTERVAL_MS / 1000 + 30) setConnState('disconnected');
      else if (secondsSince > HEARTBEAT_INTERVAL_MS / 1000) setConnState('grace');
    }, 5000);
    return () => clearInterval(check);
  }, [capReached]);

  // Countdown to next_reset_at + auto-resume the heartbeat timer at that instant.
  useEffect(() => {
    if (!capReached || !nextResetAt) return;

    const resetMs = new Date(nextResetAt).getTime();
    const tick = () => {
      const diff = Math.max(0, resetMs - Date.now());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);

    const delay = Math.max(0, resetMs - Date.now());
    resumeTimeoutRef.current = setTimeout(() => {
      setCapReached(false);
      setNextResetAt(null);
      timerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
      sendHeartbeat();
    }, delay);

    return () => {
      clearInterval(interval);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [capReached, nextResetAt, sendHeartbeat]);

  const pct = Math.min(100, (totalToday / dailyCap) * 100);
  const dotColor = connState === 'ok' ? 'bg-[#4CAF50]' : connState === 'grace' ? 'bg-[#F59E0B]' : 'bg-[#E3322F]';

  if (capReached) {
    return <CapReachedBadge totalToday={totalToday} dailyCap={dailyCap} countdown={countdown} />;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#1A1C2E] px-4 py-3">
      <div className={`h-2.5 w-2.5 rounded-full ${dotColor} ${earning ? 'animate-pulse' : ''}`} />
      <div className="relative h-10 w-10">
        <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
          <circle cx="18" cy="18" r="16" fill="none" stroke="#12142A" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="16" fill="none" stroke="#E8B429" strokeWidth="3"
            strokeDasharray={`${pct} 100`} strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-[#F9EDD8]">{totalToday}/{dailyCap} AP วันนี้</p>
        <p className="text-[10px] text-[#94A3B8]">
          {connState === 'ok' ? 'กำลังรับชม' : connState === 'grace' ? 'กำลังเชื่อมต่อ...' : 'หลุดการเชื่อมต่อ — AP หยุดสะสม'}
        </p>
      </div>
    </div>
  );
}

interface CapReachedBadgeProps {
  totalToday: number;
  dailyCap: number;
  countdown: string;
}

export function CapReachedBadge({ totalToday, dailyCap, countdown }: CapReachedBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#1A1C2E] px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#12142A] text-[#6B7280]">🔒</div>
      <div>
        <p className="text-sm font-bold text-[#6B7280]">Daily AP Cap Reached {totalToday}/{dailyCap}</p>
        <p className="text-[10px] text-[#94A3B8]">รีเซ็ตอีก {countdown}</p>
      </div>
    </div>
  );
}
