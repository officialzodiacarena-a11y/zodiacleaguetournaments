'use client';

// components/admin/bracket/TournamentExpSwitch.tsx
// สวิตช์ "ทัวร์จัดอันดับ (ให้ EXP)" ของทัวร์ → PATCH /api/v1/tournaments/:id { exp_enabled }
// ปิดกดไม่ได้เมื่อ: ทัวร์ตรวจรายชื่อแบบ LINKED (ทัวร์แยกของพี่ไอซ์) หรือผู้ใช้ไม่ใช่ ADMIN/SUPER_ADMIN
import { useState } from 'react';

export function TournamentExpSwitch({
  tournamentId,
  initialEnabled,
  rosterCheck,
  canEdit,
}: {
  tournamentId: string;
  initialEnabled: boolean;
  rosterCheck: string | null;
  canEdit: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linked = rosterCheck === 'LINKED';
  // ทัวร์ LINKED เปิดไม่ได้ · ถ้าเผลอเปิดค้างอยู่แล้ว (ข้อมูลเก่า) ยังให้ปิดได้
  const lockedReason = !canEdit
    ? 'เฉพาะ ADMIN / SUPER_ADMIN เท่านั้นที่เปลี่ยนสวิตช์นี้ได้'
    : linked && !enabled
      ? 'ทัวร์ที่ตรวจรายชื่อแบบ LINKED (ทัวร์แยกของพี่ไอซ์) เปิด EXP ไม่ได้'
      : null;

  async function toggle() {
    if (busy || lockedReason) return;
    const next = !enabled;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exp_enabled: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? 'บันทึกไม่สำเร็จ');
      setEnabled(json?.data?.exp_enabled === true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="exp-switch-box" className="mt-4 rounded-xl border border-white/10 bg-[#1A1C2E] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-white">ทัวร์จัดอันดับ (ให้ EXP)</p>
          <p className="mt-1 text-[11px] text-[#9397ab]">ตอนนี้ยังไม่แจก EXP อัตโนมัติ · จำนวน EXP ต่ออันดับจะกำหนดภายหลัง</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="ทัวร์จัดอันดับ (ให้ EXP)"
          data-testid="exp-switch"
          disabled={busy || lockedReason !== null}
          onClick={toggle}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled ? 'bg-[#9184D9]' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
      </div>
      <p className="mt-2 text-[11px] font-bold text-[#cfd3e5]">สถานะ: {enabled ? 'เปิด — ทัวร์นี้ให้ EXP' : 'ปิด — ทัวร์นี้ไม่ให้ EXP'}</p>
      {lockedReason && (
        <p data-testid="exp-switch-locked" className="mt-1 text-[11px] text-[#F59E0B]">
          {lockedReason}
        </p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
