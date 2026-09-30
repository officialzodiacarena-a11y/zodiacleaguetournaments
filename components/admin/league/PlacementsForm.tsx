'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StandingTeam {
  teamId: string;
  teamName: string;
  divisionTier: string | null;
}

interface PlacementsFormProps {
  seasons: { id: string; name: string }[];
  standingsBySeasonId: Record<string, StandingTeam[]>;
}

interface PlacementsResult {
  inserted?: number;
  existing?: number;
  replaced?: number;
  removed?: number;
}

const TIERS = ['PRO', 'CHALLENGER', 'OPEN'] as const;

export function PlacementsForm({ seasons, standingsBySeasonId }: PlacementsFormProps) {
  const router = useRouter();
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [tier, setTier] = useState<(typeof TIERS)[number]>('PRO');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlacementsResult | null>(null);

  const teams = useMemo(
    () => (standingsBySeasonId[seasonId] ?? []).filter((t) => t.divisionTier === tier),
    [standingsBySeasonId, seasonId, tier]
  );

  function handleSeasonChange(nextSeasonId: string) {
    setSeasonId(nextSeasonId);
    setValues({});
    setResult(null);
  }

  function handleTierChange(nextTier: (typeof TIERS)[number]) {
    setTier(nextTier);
    setValues({});
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const placements = teams
      .map((t) => ({ teamId: t.teamId, raw: values[t.teamId]?.trim() ?? '' }))
      .filter((t) => t.raw !== '')
      .map((t) => ({ teamId: t.teamId, placement: Number(t.raw) }));

    if (placements.length === 0) {
      setError('ต้องใส่อันดับอย่างน้อย 1 ทีม');
      return;
    }

    const placementValues = placements.map((p) => p.placement);
    if (new Set(placementValues).size !== placementValues.length) {
      setError('อันดับห้ามซ้ำ');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/v1/admin/league/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, tier, placements }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'ทำรายการไม่สำเร็จ');
        return;
      }
      setResult(json.data as PlacementsResult);
      router.refresh();
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-[#1A1C2E] p-4 flex flex-col gap-3">
      <h3 className="text-sm font-extrabold text-white">ยืนยันอันดับจบซีซั่น</h3>

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
          ชั้น
          <select
            value={tier}
            onChange={(e) => handleTierChange(e.target.value as (typeof TIERS)[number])}
            className="rounded border border-white/10 bg-[#0D0E1A] px-2 py-1.5 text-xs text-white"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        {teams.length === 0 && <div className="text-xs text-[#75798c]">ไม่มีทีมในชั้นนี้</div>}
        {teams.map((t) => (
          <label key={t.teamId} className="flex items-center gap-2 text-xs text-[#cfd3e5]">
            <span className="w-48 truncate">{t.teamName}</span>
            <input
              type="number"
              min={1}
              max={64}
              value={values[t.teamId] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [t.teamId]: e.target.value }))}
              placeholder="อันดับ (ว่าง = ไม่ส่ง)"
              className="w-32 rounded border border-white/10 bg-[#0D0E1A] px-2 py-1 text-white"
            />
          </label>
        ))}
      </div>

      <p className="text-[10px] text-[#75798c]">
        ส่งรายชื่อเต็มของชั้นนี้ทุกครั้ง · ทีมที่เคยมีอันดับแต่ไม่อยู่ในรายชื่อจะถูกกลับรายการ
      </p>

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-lg bg-gradient-to-r from-[#E8B429] to-[#d97706] px-4 py-2 text-xs font-black text-[#0D0E1A] disabled:opacity-40"
      >
        ยืนยันอันดับ
      </button>

      {result && (
        <div className="text-[11px] text-[#94A3B8]">
          เพิ่ม {result.inserted ?? 0} · มีแล้ว {result.existing ?? 0} · แทนที่ {result.replaced ?? 0} · ถอด {result.removed ?? 0}
        </div>
      )}
      {error && <div className="text-[11px] text-rose-300">{error}</div>}
    </form>
  );
}
