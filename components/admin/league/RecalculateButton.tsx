'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RecalculateButton({ circuitId }: { circuitId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/league/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuitId }),
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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded border border-[#9184d9]/40 bg-[#9184d9]/10 px-3 py-1.5 text-xs font-bold text-[#a99ce6] hover:bg-[#9184d9]/20 disabled:opacity-40"
      >
        คำนวณตารางใหม่
      </button>
      {error && <div className="text-[10px] text-rose-300">{error}</div>}
    </div>
  );
}
