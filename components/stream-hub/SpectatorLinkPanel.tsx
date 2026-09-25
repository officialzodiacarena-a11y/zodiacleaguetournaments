'use client';

// Spectator Link — ทุกอย่างที่เกี่ยวกับ "ข้อมูลจากในเกม" รวมไว้จุดเดียวในหน้า Stream Hub
//   - แถบสถานะย่อ: ตอนนี้มี telemetry เข้ามาไหม มาจากไหน (OCR / Bridge) ล่าสุดกี่วินาทีก่อน + รหัสห้อง
//   - ลิ้นชัก Setup: รหัสห้อง, Observer Token, OCR Round & Roster Engine
// ลิ้นชักซ่อนด้วย CSS (ไม่ unmount) เพราะ OCR จับภาพหน้าจอเฉพาะตอนแผงยังอยู่ — ปิดลิ้นชักแล้ว OCR ต้องทำงานต่อ
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Radar, X, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import OcrObserverBridgePanel from '@/components/observer/OcrObserverBridgePanel';

export type FeedSource = 'OCR' | 'BRIDGE';
const STALE_AFTER_MS = 5000;

export function SpectatorLinkPanel({
  matchId,
  teamAId,
  teamBId,
  teamATag,
  teamBTag,
  lastFrameAt,
  source,
  disabled,
}: {
  matchId: string;
  teamAId: string | null;
  teamBId: string | null;
  teamATag: string;
  teamBTag: string;
  /** เวลาที่ได้รับ telemetry ล่าสุด (หน้า Stream Hub ฟังช่อง match-realtime ให้) */
  lastFrameAt: number | null;
  source: FeedSource | null;
  /** โหมดถ่ายทอดสดที่ไม่ใช้ข้อมูลในเกม (B/C) — ปิดแผงนี้ */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // เปิดลิ้นชักครั้งแรกเมื่อไหร่ค่อยสร้าง แล้วคงไว้ตลอด (ปิดแค่ซ่อน) — OCR ที่กำลังจับภาพจะไม่หลุด
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [formatConfig, setFormatConfig] = useState<Record<string, unknown>>({});
  const [lobbyInput, setLobbyInput] = useState('');
  const [gameNumber, setGameNumber] = useState(1);
  const [observerToken, setObserverToken] = useState<string | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // หน้าแม่ใส่ key={matchId} — เปลี่ยนแมตช์แล้วแผงนี้เริ่มใหม่หมด (token/OCR ของแมตช์เก่าไม่ค้าง)
  // โหลดรหัสห้อง + เลขแมพปัจจุบัน แล้วรีเฟรชทุก 15 วิ (เลขแมพเปลี่ยนตอนจบแมพ)
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await createClient().from('matches').select('format_config').eq('id', matchId).maybeSingle();
      if (active) setFormatConfig((data?.format_config as Record<string, unknown>) ?? {});
      try {
        const res = await fetch(`/api/v1/matches/${matchId}/rounds`, { cache: 'no-store' });
        if (res.ok && active) {
          const json = (await res.json()) as { current_game_number: number | null };
          setGameNumber(json.current_game_number ?? 1);
        }
      } catch {
        // ใช้ค่าเดิม
      }
    };
    void load();
    const t = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [matchId]);

  const lobbyCode = (formatConfig.lobby_code as string) || '';

  const saveLobby = async () => {
    const code = lobbyInput.trim().toUpperCase();
    if (!code) return;
    try {
      // บันทึกผ่านเซิร์ฟเวอร์ (ตรวจสิทธิ์ broadcast) — เขียนตรงจากเบราว์เซอร์ RLS จะบล็อกเงียบๆ
      const res = await fetch(`/api/v1/matches/${matchId}/broadcast-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobby_code: code }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({ type: 'error', text: `บันทึกรหัสห้องไม่สำเร็จ: ${json?.error?.message || res.status}` });
        return;
      }
      setFormatConfig((prev) => ({ ...prev, lobby_code: json.lobby_code }));
      setLobbyInput('');
      setMsg({ type: 'info', text: `บันทึกรหัสห้อง ${code} แล้ว` });
    } catch {
      setMsg({ type: 'error', text: 'บันทึกรหัสห้องไม่สำเร็จ (เครือข่าย)' });
    }
  };

  const mintToken = async () => {
    setTokenBusy(true);
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/observer-token`, { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg({ type: 'error', text: `ออก Observer Token ไม่สำเร็จ: ${json?.error?.message || res.status}` });
        return;
      }
      setObserverToken(json.token as string);
      setMsg({ type: 'info', text: 'ออก token ใหม่แล้ว — คัดลอกไปตั้งค่าเครื่องคนจับกล้องเดี๋ยวนี้ (token เก่าใช้ไม่ได้แล้ว)' });
    } catch {
      setMsg({ type: 'error', text: 'ออก Observer Token ไม่สำเร็จ (เครือข่าย)' });
    } finally {
      setTokenBusy(false);
    }
  };

  const ageMs = lastFrameAt ? now - lastFrameAt : null;
  const live = ageMs !== null && ageMs < STALE_AFTER_MS;
  const feedLabel = disabled
    ? 'ปิด (โหมดสตรีมภายนอก)'
    : ageMs === null
      ? 'ไม่มีข้อมูล'
      : `${source} · ${Math.round(ageMs / 1000)}s`;
  const dot = disabled ? 'bg-neutral-600' : live ? 'bg-emerald-400 animate-pulse' : ageMs === null ? 'bg-neutral-500' : 'bg-rose-500';

  return (
    <>
      <div
        className={`flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 px-2 py-1 font-mono text-[11px] ${disabled ? 'opacity-50' : ''}`}
      >
        <span className="flex items-center gap-1 font-black text-violet-300">
          <Radar className="h-3.5 w-3.5" /> SPECTATOR LINK
        </span>
        <span className="flex items-center gap-1 text-neutral-300" title="telemetry จากในเกม (Spectra / OCR) ที่เข้ามาล่าสุด">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {feedLabel}
        </span>
        <span className="flex items-center gap-1 text-neutral-400" title="รหัสห้องในเกม">
          <KeyRound className="h-3 w-3" /> {lobbyCode || '—'}
        </span>
        <button
          onClick={() => {
            setDrawerMounted(true);
            setOpen(true);
          }}
          disabled={disabled}
          className="rounded border border-violet-500/40 px-2 py-0.5 font-bold text-violet-200 hover:bg-violet-500/15 disabled:cursor-not-allowed"
        >
          Setup
        </button>
      </div>

      {/* ลิ้นชักด้านขวา — วาดที่ body (header ของหน้าแม่มี backdrop-blur ทำให้ fixed ถูกตัดในกรอบ) และซ่อนด้วย CSS เท่านั้น */}
      {drawerMounted && createPortal(
      <div className={`fixed inset-0 z-[90] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-violet-500/30 bg-[#0B0F17] p-5 text-white shadow-2xl transition-transform duration-200 ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-mono text-sm font-black text-violet-300">
              <Radar className="h-4 w-4" /> Spectator Link — Setup
            </h2>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-neutral-400 hover:bg-white/10" aria-label="ปิด">
              <X className="h-4 w-4" />
            </button>
          </div>

          {msg && (
            <button
              onClick={() => setMsg(null)}
              className={`mb-4 w-full rounded border p-2 text-left font-mono text-[11px] ${
                msg.type === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {msg.text}
            </button>
          )}

          <div className="space-y-5 font-mono text-xs">
            {/* 1. รหัสห้อง */}
            <section className="rounded-xl border border-white/5 bg-[#12121A] p-4">
              <h3 className="mb-2 text-[11px] font-black text-[#00D4FF]">1. รหัสห้องในเกม (Lobby Code)</h3>
              <div className="flex gap-2">
                <input
                  value={lobbyInput}
                  onChange={(e) => setLobbyInput(e.target.value.toUpperCase())}
                  placeholder={lobbyCode || 'เช่น ZA-KEY-99'}
                  className="flex-1 rounded border border-white/10 bg-black/60 px-3 py-1.5 uppercase outline-none focus:border-[#00D4FF]"
                />
                <button
                  onClick={saveLobby}
                  className="rounded border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-3 py-1.5 font-bold text-[#00D4FF] hover:bg-[#00D4FF]/20"
                >
                  SAVE
                </button>
              </div>
            </section>

            {/* 2. Observer Token */}
            <section className="rounded-xl border border-white/5 bg-[#12121A] p-4">
              <h3 className="mb-1 text-[11px] font-black text-[#00D4FF]">2. Observer Token</h3>
              <p className="mb-3 text-[10px] leading-relaxed text-gray-500">
                ใช้กับเครื่องคนจับกล้อง (Spectra) และ OCR ด้านล่าง — ออกใหม่เมื่อไหร่ token เก่าใช้ไม่ได้ทันที
              </p>
              <button
                onClick={mintToken}
                disabled={tokenBusy}
                className="w-full rounded border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-3 py-2 font-bold text-[#00D4FF] hover:bg-[#00D4FF]/20 disabled:opacity-40"
              >
                {tokenBusy ? 'GENERATING...' : observerToken ? 'ROTATE TOKEN' : 'GENERATE OBSERVER TOKEN'}
              </button>
              {observerToken && (
                <div className="mt-3 space-y-2">
                  <label className="block text-[10px] text-gray-500">Endpoint (POST)</label>
                  <pre className="select-all whitespace-pre-wrap break-all rounded border border-white/10 bg-black/60 px-3 py-2 text-[10px] text-gray-300">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/matches/${matchId}/telemetry`}
                  </pre>
                  <label className="block text-[10px] text-gray-500">Token (แสดงครั้งเดียว — คัดลอกเดี๋ยวนี้)</label>
                  <pre className="select-all whitespace-pre-wrap break-all rounded border border-[#00D4FF]/40 bg-black/60 px-3 py-2 text-[10px] text-[#00D4FF]">
                    {observerToken}
                  </pre>
                </div>
              )}
            </section>

            {/* 3. OCR */}
            {teamAId && teamBId ? (
              <OcrObserverBridgePanel
                matchId={matchId}
                gameNumber={gameNumber}
                teamAId={teamAId}
                teamBId={teamBId}
                teamATag={teamATag}
                teamBTag={teamBTag}
                observerToken={observerToken}
              />
            ) : (
              <p className="text-[10px] text-gray-500">OCR ใช้ได้เมื่อแมตช์มีทั้ง 2 ทีมแล้ว</p>
            )}
          </div>
        </aside>
      </div>,
      document.body,
      )}
    </>
  );
}
