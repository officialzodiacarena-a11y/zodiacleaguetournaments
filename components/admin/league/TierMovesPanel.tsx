'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TierMoveRow {
  id: string;
  seasonId: string;
  teamName: string;
  fromTier: string;
  toTier: string;
  reason: string | null;
  status: string;
}

interface TierMovesPanelProps {
  seasons: { id: string; name: string }[];
  nextSeasonOptions: { id: string; name: string }[];
  moves: TierMoveRow[];
}

export function TierMovesPanel({ seasons, nextSeasonOptions, moves }: TierMovesPanelProps) {
  const router = useRouter();
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [nextSeasonId, setNextSeasonId] = useState(nextSeasonOptions[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposedCount, setProposedCount] = useState<number | null>(null);

  const filteredMoves = useMemo(() => moves.filter((m) => m.seasonId === seasonId), [moves, seasonId]);
  const hasPending = filteredMoves.some((m) => m.status === 'PROPOSED');

  async function handlePropose() {
    setError(null);
    setProposedCount(null);
    setBusy(true);
    try {
      const res = await fetch('/api/v1/admin/league/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, nextSeasonId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'ทำรายการไม่สำเร็จ');
        return;
      }
      const data = json.data as { proposed?: number } | undefined;
      setProposedCount(data?.proposed ?? null);
      router.refresh();
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  async function handleDecide(moveId: string, decision: 'CONFIRM' | 'REJECT') {
    let reason: string | undefined;
    if (decision === 'REJECT') {
      const input = prompt('เหตุผลที่ไม่ยืนยัน (ไม่บังคับ)');
      reason = input ?? undefined;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/league/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveId, decision, reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'ทำรายการไม่สำเร็จ');
        return;
      }
      router.refresh();
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  async function handleRollover() {
    if (!confirm('ยกทีมไปซีซั่นถัดไป?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/league/rollover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, nextSeasonId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'ทำรายการไม่สำเร็จ');
        return;
      }
      router.refresh();
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#1A1C2E] p-4 flex flex-col gap-3">
      <h3 className="text-sm font-extrabold text-white">เลื่อน / ตกชั้น</h3>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[11px] text-[#9397ab]">
          ซีซั่นที่จบ
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="rounded border border-white/10 bg-[#0D0E1A] px-2 py-1.5 text-xs text-white"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[11px] text-[#9397ab]">
          ซีซั่นถัดไป
          <select
            value={nextSeasonId}
            onChange={(e) => setNextSeasonId(e.target.value)}
            className="rounded border border-white/10 bg-[#0D0E1A] px-2 py-1.5 text-xs text-white"
          >
            {nextSeasonOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePropose}
          disabled={busy}
          className="rounded border border-[#9184d9]/40 bg-[#9184d9]/10 px-3 py-1.5 text-xs font-bold text-[#a99ce6] disabled:opacity-40"
        >
          เสนอรายชื่อ
        </button>
        <button
          type="button"
          onClick={handleRollover}
          disabled={busy || hasPending}
          className="rounded border border-[#E8B429]/40 bg-[#E8B429]/10 px-3 py-1.5 text-xs font-bold text-[#E8B429] disabled:opacity-40"
        >
          ยกทีมไปซีซั่นถัดไป
        </button>
      </div>

      {proposedCount !== null && (
        <div className="text-[11px] text-[#94A3B8]">เสนอแล้ว {proposedCount} ทีม</div>
      )}
      {error && <div className="text-[11px] text-rose-300">{error}</div>}

      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full text-xs text-left">
          <thead className="bg-white/5 text-[#75798c] uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2">ทีม</th>
              <th className="px-3 py-2">จากชั้น</th>
              <th className="px-3 py-2">ไปชั้น</th>
              <th className="px-3 py-2">เหตุผล</th>
              <th className="px-3 py-2">สถานะ</th>
              <th className="px-3 py-2">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredMoves.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2 font-bold text-white">{m.teamName}</td>
                <td className="px-3 py-2">{m.fromTier}</td>
                <td className="px-3 py-2">{m.toTier}</td>
                <td className="px-3 py-2">{m.reason ?? '-'}</td>
                <td className="px-3 py-2">{m.status}</td>
                <td className="px-3 py-2">
                  {m.status === 'PROPOSED' && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleDecide(m.id, 'CONFIRM')}
                        disabled={busy}
                        className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300 disabled:opacity-40"
                      >
                        ยืนยัน
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecide(m.id, 'REJECT')}
                        disabled={busy}
                        className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-300 disabled:opacity-40"
                      >
                        ไม่ยืนยัน
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredMoves.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-[#75798c]" colSpan={6}>
                  ยังไม่มีข้อเสนอ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
