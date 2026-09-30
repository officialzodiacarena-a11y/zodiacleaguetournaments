'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AwardResult {
  inserted?: number;
  existing?: number;
  replaced?: number;
  skipped?: unknown[];
  stale?: unknown[];
}

export function AwardButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AwardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(fixStale: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/league/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId, fixStale }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'ทำรายการไม่สำเร็จ');
        return;
      }
      setResult(json.data as AwardResult);
      router.refresh();
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setBusy(false);
    }
  }

  async function handleFixStale() {
    if (!confirm('แทนที่แต้มตามผลแมตช์ล่าสุด?')) return;
    await submit(true);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => submit(false)}
        disabled={busy}
        className="rounded border border-[#E8B429]/40 bg-[#E8B429]/10 px-2.5 py-1 text-[11px] font-bold text-[#E8B429] hover:bg-[#E8B429]/20 disabled:opacity-40"
      >
        คิดแต้ม
      </button>
      {result && (
        <div className="text-[10px] text-[#94A3B8]">
          เพิ่ม {result.inserted ?? 0} · มีแล้ว {result.existing ?? 0} · แทนที่ {result.replaced ?? 0}
          {result.skipped && result.skipped.length > 0 && <> · ข้าม {result.skipped.length}</>}
        </div>
      )}
      {result?.stale && result.stale.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-[#fbbf24]">ผลแมตช์เปลี่ยนหลังคิดแต้ม {result.stale.length} รายการ</div>
          <button
            type="button"
            onClick={handleFixStale}
            disabled={busy}
            className="rounded border border-[#eab308]/40 bg-[#eab308]/10 px-2.5 py-1 text-[11px] font-bold text-[#fbbf24] hover:bg-[#eab308]/20 disabled:opacity-40"
          >
            แทนที่ตามผลล่าสุด
          </button>
        </div>
      )}
      {error && <div className="text-[10px] text-rose-300">{error}</div>}
    </div>
  );
}
