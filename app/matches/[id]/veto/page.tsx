'use client';

// ห้อง Veto ของกัปตัน: Ban / Pick แมพตามลำดับใน veto_format (ข้อมูลทั้งหมดมาจาก GET /veto, กดผ่าน POST /veto/action)
// - ปุ่มกดได้เฉพาะเมื่อถึงตาของทีมตัวเองและเป็นผู้นำทีม (CAPTAIN / MANAGER / COACH) — เซิร์ฟเวอร์ตรวจซ้ำทุกครั้ง
// - หมดเวลา 60 วินาที ระบบเลือกแมพให้ (Auto-pick) หน้านี้เรียก POST /veto/tick ทุก 5 วินาทีเพื่อให้ Auto-pick ทันเวลา

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TEAM_A_HEX, TEAM_B_HEX } from '@/components/overlay/series';
import { mapTileState, secondsRemaining, vetoViewerState, type VetoRowView } from '@/lib/veto/view';
import type { TeamSide, VetoActionKind } from '@/lib/veto/engine';

interface VetoState {
  match_id: string;
  status: string;
  team_a_id: string | null;
  team_b_id: string | null;
  viewer: { authenticated: boolean; side: TeamSide | null };
  map_pool: string[];
  veto_sequence: { step: number; action: VetoActionKind; team: TeamSide | null }[];
  completed_steps: VetoRowView[];
  current_step: number | null;
  current_action: VetoActionKind | null;
  is_complete: boolean;
  seconds_left: number | null;
  time_limit_seconds: number | null;
  config_problems: string[];
}

interface TeamLabel {
  name: string;
  tag: string | null;
}

const POLL_MS = 2000;
const TICK_MS = 5000;

function teamHex(side: TeamSide | null) {
  return side === 'A' ? TEAM_A_HEX : side === 'B' ? TEAM_B_HEX : '#C9A84C';
}

export default function VetoRoomPage() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;

  const [veto, setVeto] = useState<VetoState | null>(null);
  const [teams, setTeams] = useState<{ A: TeamLabel | null; B: TeamLabel | null }>({ A: null, B: null });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const vetoStatusRef = useRef<string | null>(null);

  const fetchVeto = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/veto`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(typeof data?.error === 'string' ? data.error : 'โหลดข้อมูล Veto ไม่สำเร็จ');
        return;
      }
      vetoStatusRef.current = data.status;
      setVeto(data as VetoState);
      setFetchedAt(Date.now());
      setLoadError(null);
    } catch {
      setLoadError('การเชื่อมต่อขัดข้อง กำลังลองใหม่...');
    }
  }, [matchId]);

  // ชื่อทีมจาก Lobby API (ดึงครั้งเดียว)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/matches/${matchId}/lobby`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setTeams({
          A: data.team_a ? { name: data.team_a.name, tag: data.team_a.tag } : null,
          B: data.team_b ? { name: data.team_b.name, tag: data.team_b.tag } : null,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    fetchVeto();
    const poll = setInterval(fetchVeto, POLL_MS);
    return () => clearInterval(poll);
  }, [fetchVeto]);

  // Heartbeat: ให้ระบบเติม Auto-pick / DECIDER ตรงเวลา แม้ไม่มีใครเปิด Overlay (ทำเฉพาะตอนสถานะ VETO)
  useEffect(() => {
    const tick = setInterval(() => {
      if (vetoStatusRef.current !== 'VETO') return;
      fetch(`/api/v1/matches/${matchId}/veto/tick`, { method: 'POST' })
        .then(() => fetchVeto())
        .catch(() => undefined);
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [matchId, fetchVeto]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const currentStepInfo = veto?.veto_sequence.find((s) => s.step === veto.current_step) ?? null;
  const viewerState = veto
    ? vetoViewerState({
        matchStatus: veto.status,
        complete: veto.is_complete,
        currentAction: veto.current_action,
        currentTeam: currentStepInfo?.team ?? null,
        viewerSide: veto.viewer.side,
      })
    : null;
  const myTurn = viewerState === 'MY_TURN';
  const remaining = veto ? secondsRemaining(veto.seconds_left, fetchedAt, now) : null;

  // ล้างแมพที่เลือกไว้เมื่อไม่ใช่ตาของเรา / แมพนั้นถูกใช้ไปแล้ว
  const selectedStillFree = veto && selected ? mapTileState(selected, veto.completed_steps).kind === 'AVAILABLE' : false;
  const effectiveSelected = myTurn && selectedStillFree ? selected : null;

  async function submitAction() {
    if (!veto || !effectiveSelected || !veto.current_action || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/matches/${matchId}/veto/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: veto.current_action, map_name: effectiveSelected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(typeof data?.error === 'string' ? data.error : `ส่งคำสั่งไม่สำเร็จ (${res.status})`);
      } else {
        setSelected(null);
      }
      await fetchVeto();
    } catch {
      setActionError('การเชื่อมต่อขัดข้อง ส่งคำสั่งไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  if (!veto) {
    return (
      <main className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center font-mono">
        <span className={loadError ? 'text-rose-400 text-sm' : 'text-cyan-300 animate-pulse tracking-widest text-sm'}>
          {loadError ?? 'กำลังโหลดห้อง Veto...'}
        </span>
      </main>
    );
  }

  const labelOf = (side: TeamSide | null) => {
    if (!side) return 'SYSTEM';
    const team = teams[side];
    return team ? `${team.name}${team.tag ? ` [${team.tag}]` : ''}` : `TEAM ${side}`;
  };
  const sideOfTeamId = (teamId: string | null): TeamSide | null => (teamId && teamId === veto.team_a_id ? 'A' : teamId && teamId === veto.team_b_id ? 'B' : null);
  const actionVerb = veto.current_action === 'PICK' ? 'PICK' : 'BAN';

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white font-mono p-4 lg:p-6 selection:bg-cyan-500 selection:text-black">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-2 mb-4 border border-[#C9A84C]/40 bg-[#12121A]/80 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-400 uppercase tracking-widest">Map Veto</span>
          <span className="text-[#C9A84C] font-bold tracking-wider">{veto.match_id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <span style={{ color: TEAM_A_HEX }}>{labelOf('A')}</span>
          <span className="text-zinc-600">VS</span>
          <span style={{ color: TEAM_B_HEX }}>{labelOf('B')}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-[#00D4FF]/50 text-[#00D4FF] bg-[#00D4FF]/10">
          {veto.status}
        </span>
      </header>

      {loadError && <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{loadError}</div>}
      {veto.config_problems.length > 0 && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          ตั้งค่า Veto ของ Stage ไม่ถูกต้อง แจ้งทีมงาน: {veto.config_problems.join('; ')}
        </div>
      )}

      {/* STATUS BANNER */}
      <div
        className="mb-4 rounded-xl border px-4 py-4 flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: `${teamHex(currentStepInfo?.team ?? null)}66`, background: `${teamHex(currentStepInfo?.team ?? null)}12` }}
      >
        <div>
          {viewerState === 'MY_TURN' && (
            <>
              <p className="text-lg font-black uppercase tracking-wider" style={{ color: teamHex(veto.viewer.side) }}>ตาของคุณ: {actionVerb} 1 แมพ</p>
              <p className="text-[11px] text-zinc-400 mt-1">เลือกแมพจากรายการด้านล่าง แล้วกดยืนยัน (ยกเลิกไม่ได้หลังยืนยัน)</p>
            </>
          )}
          {viewerState === 'OPPONENT_TURN' && (
            <>
              <p className="text-lg font-black uppercase tracking-wider text-zinc-200">รอ {labelOf(currentStepInfo?.team ?? null)} {actionVerb}</p>
              <p className="text-[11px] text-zinc-400 mt-1">ยังไม่ถึงตาของคุณ</p>
            </>
          )}
          {viewerState === 'VIEW_ONLY' && (
            <>
              <p className="text-lg font-black uppercase tracking-wider text-zinc-200">ตา {labelOf(currentStepInfo?.team ?? null)}: {actionVerb}</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                {veto.viewer.authenticated
                  ? 'คุณดูได้อย่างเดียว เฉพาะ Captain / Manager / Coach ของทีมในแมตช์นี้เท่านั้นที่ Ban/Pick ได้'
                  : (
                    <>
                      กรุณา <Link href="/login" className="text-[#00D4FF] underline">เข้าสู่ระบบ</Link> ด้วยบัญชีกัปตัน (ตอนนี้ดูได้อย่างเดียว)
                    </>
                  )}
              </p>
            </>
          )}
          {viewerState === 'AUTOMATIC' && (
            <>
              <p className="text-lg font-black uppercase tracking-wider text-[#C9A84C]">DECIDER</p>
              <p className="text-[11px] text-zinc-400 mt-1">ระบบสุ่มแมพสุดท้ายจากแมพที่เหลือ กำลังประมวลผล...</p>
            </>
          )}
          {viewerState === 'COMPLETE' && (
            <>
              <p className="text-lg font-black uppercase tracking-wider text-emerald-400">Veto เสร็จสิ้น</p>
              <p className="text-[11px] text-zinc-400 mt-1">แมพที่เล่นคือแมพที่ระบุ PICK / DECIDER ด้านล่าง แมตช์กำลังเริ่มแข่ง</p>
            </>
          )}
          {viewerState === 'NOT_VETO' && (
            <>
              <p className="text-lg font-black uppercase tracking-wider text-zinc-200">ยังไม่ถึงช่วง Veto</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                สถานะแมตช์ตอนนี้ {veto.status} — ต้องรอให้ทั้งสองทีมกดพร้อมที่ <Link href={`/matches/${matchId}/lobby`} className="text-[#00D4FF] underline">ห้อง Lobby</Link> ก่อน
              </p>
            </>
          )}
        </div>
        {remaining !== null && veto.status === 'VETO' && !veto.is_complete && viewerState !== 'AUTOMATIC' && (
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">เหลือเวลา</span>
            <span className={`text-4xl font-black tabular-nums ${remaining <= 10 ? 'text-rose-400 animate-pulse' : 'text-[#C9A84C]'}`}>{remaining}</span>
            <span className="text-xs text-zinc-500"> วิ</span>
            <span className="text-[10px] text-zinc-500 block">หมดเวลาระบบเลือกให้</span>
          </div>
        )}
      </div>

      {actionError && <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{actionError}</div>}

      {/* SEQUENCE RAIL */}
      <div className="mb-4 flex flex-wrap gap-2">
        {veto.veto_sequence.map((s) => {
          const row = veto.completed_steps.find((r) => r.step_order === s.step);
          const isCurrent = veto.status === 'VETO' && !veto.is_complete && veto.current_step === s.step;
          return (
            <div
              key={s.step}
              className={`rounded-lg border px-3 py-2 text-[11px] min-w-[112px] ${isCurrent ? 'border-[#C9A84C] bg-[#C9A84C]/10' : 'border-white/10 bg-[#12121A]/80'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500">#{s.step}</span>
                <span className="font-black" style={{ color: teamHex(s.team) }}>{s.action}</span>
              </div>
              <div className="text-[10px] text-zinc-400 truncate">{s.team ? labelOf(s.team) : 'SYSTEM'}</div>
              <div className={`mt-1 font-bold truncate ${row ? 'text-white' : 'text-zinc-600'}`}>
                {row ? row.map_name : isCurrent ? 'กำลังเลือก...' : '—'}
                {row?.was_auto ? <span className="ml-1 text-[9px] text-amber-400">AUTO</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* MAP POOL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {veto.map_pool.map((map) => {
          const tile = mapTileState(map, veto.completed_steps);
          const free = tile.kind === 'AVAILABLE';
          const clickable = myTurn && free && !submitting;
          const isSelected = effectiveSelected === map;
          const ownerSide = tile.kind === 'BANNED' || tile.kind === 'PICKED' ? sideOfTeamId(tile.teamId) : null;
          return (
            <button
              key={map}
              type="button"
              disabled={!clickable}
              onClick={() => {
                setActionError(null);
                setSelected(map);
              }}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#C9A84C] bg-[#C9A84C]/15 shadow-[0_0_18px_rgba(201,168,76,0.25)]'
                  : free
                    ? clickable
                      ? 'border-white/15 bg-[#12121A] hover:border-[#00D4FF]/60 hover:bg-[#00D4FF]/5'
                      : 'border-white/10 bg-[#12121A]/80'
                    : tile.kind === 'BANNED'
                      ? 'border-white/5 bg-black/50 opacity-60'
                      : 'border-emerald-500/40 bg-emerald-500/5'
              } disabled:cursor-not-allowed`}
            >
              <span className={`block text-base font-black uppercase tracking-wider ${tile.kind === 'BANNED' ? 'line-through text-zinc-500' : 'text-white'}`}>{map}</span>
              <span className="block text-[10px] mt-1 uppercase tracking-widest" style={{ color: ownerSide ? teamHex(ownerSide) : undefined }}>
                {tile.kind === 'AVAILABLE' && (isSelected ? 'เลือกอยู่' : 'ว่าง')}
                {tile.kind === 'BANNED' && `BANNED โดย ${ownerSide ? labelOf(ownerSide) : 'SYSTEM'}${tile.auto ? ' (AUTO)' : ''}`}
                {tile.kind === 'PICKED' && `PICKED โดย ${ownerSide ? labelOf(ownerSide) : 'SYSTEM'}${tile.auto ? ' (AUTO)' : ''}`}
                {tile.kind === 'DECIDER' && `DECIDER${tile.auto ? ' (AUTO)' : ''}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONFIRM */}
      {myTurn && (
        <div className="sticky bottom-4 flex justify-center">
          <button
            type="button"
            onClick={submitAction}
            disabled={!effectiveSelected || submitting}
            className="rounded-xl px-8 py-3 text-sm font-black uppercase tracking-widest border transition-colors disabled:opacity-40 bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/30"
          >
            {submitting ? 'กำลังส่ง...' : effectiveSelected ? `ยืนยัน ${actionVerb} ${effectiveSelected}` : `เลือกแมพที่จะ ${actionVerb}`}
          </button>
        </div>
      )}

      <p className="mt-6 text-[10px] text-zinc-600">
        <Link href={`/matches/${matchId}/lobby`} className="hover:text-zinc-400 underline">กลับห้อง Lobby</Link>
      </p>
    </main>
  );
}
