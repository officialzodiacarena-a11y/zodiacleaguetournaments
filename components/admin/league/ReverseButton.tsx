'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReverseButton({ txId }: { txId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const reason = prompt('เหตุผลที่กลับรายการนี้');
    if (!reason) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/league/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txId, reason }),
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
        className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
      >
        กลับรายการ
      </button>
      {error && <div className="text-[10px] text-rose-300">{error}</div>}
    </div>
  );
}
