'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StandingTeam {
  teamId: string;
  teamName: string;
}

interface AdjustFormProps {
  seasons: { id: string; name: string }[];
  standingsBySeasonId: Record<string, StandingTeam[]>;
}

function newKey(): string {
  return crypto.randomUUID();
}

export function AdjustForm({ seasons, standingsBySeasonId }: AdjustFormProps) {
  const router = useRouter();
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const teams = useMemo(() => standingsBySeasonId[seasonId] ?? [], [standingsBySeasonId, seasonId]);
  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? '');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState(newKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSeasonChange(nextSeasonId: string) {
    setSeasonId(nextSeasonId);
    setTeamId((standingsBySeasonId[nextSeasonId] ?? [])[0]?.teamId ?? '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    const pointsNum = Number(points);
    if (!Number.isInteger(pointsNum) || pointsNum === 0) {
      setError('แต้มต้องเป็นจำนวนเต็ม ไม่เท่ากับ 0');
      return;
    }
    if (!reason.trim()) {
      setError('กรุณาใส่เหตุผล');
      return;
    }
    const team = teams.find((t) => t.teamId === teamId);
    if (!team) {
      setError('กรุณาเลือกทีม');
      return;
    }

    if (!confirm(`ยืนยัน ${pointsNum} แต้มให้ ${team.teamName}?`)) return;

    setBusy(true);
    try {
      const res = await fetch('/api/v1/admin/league/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, teamId, points: pointsNum, reason: reason.trim(), key }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'ทำรายการไม่สำเร็จ');
        return;
      }
      setDone(true);
      setPoints('');
      setReason('');
      setKey(newKey());
      router.refresh();
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-[#1A1C2E] p-4 flex flex-col gap-3">
      <h3 className="text-sm font-extrabold text-white">โบนัส / โทษ</h3>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[11px] text-[#9397ab]">
          ซีซั่น
          <select
            value={seasonId}
            onChange={(e) => handleSeasonChange(e.target.value)}
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
          ทีม
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="rounded border border-white/10 bg-[#0D0E1A] px-2 py-1.5 text-xs text-white"
          >
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.teamName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[11px] text-[#9397ab]">
          แต้ม (ลบ = โทษ)
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-28 rounded border border-white/10 bg-[#0D0E1A] px-2 py-1.5 text-xs text-white"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-[11px] text-[#9397ab]">
        เหตุผล
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded border border-white/10 bg-[#0D0E1A] px-2 py-1.5 text-xs text-white"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-gradient-to-r from-[#E8B429] to-[#d97706] px-4 py-2 text-xs font-black text-[#0D0E1A] disabled:opacity-40"
      >
        ส่งรายการ
      </button>

      {done && <div className="text-[11px] text-emerald-300">บันทึกแล้ว</div>}
      {error && <div className="text-[11px] text-rose-300">{error}</div>}
    </form>
  );
}
