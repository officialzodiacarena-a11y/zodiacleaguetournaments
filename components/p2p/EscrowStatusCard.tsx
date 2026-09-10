'use client';

import { useEffect, useState } from 'react';

// UI/UX Spec status: Pending Prototype — see StorefrontManager.tsx note.

interface EscrowStatusCardProps {
  escrowId: string;
  isReceiver: boolean;
  isSender: boolean;
}

interface EscrowData {
  status: string;
  amount_ap: number;
  approval_deadline: string;
  auto_released_at: string | null;
}

export function EscrowStatusCard({ escrowId, isReceiver, isSender }: EscrowStatusCardProps) {
  const [data, setData] = useState<EscrowData | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/ap/transfer/${escrowId}`)
      .then((r) => r.json())
      .then((json) => !cancelled && setData(json));
    return () => {
      cancelled = true;
    };
  }, [escrowId]);

  useEffect(() => {
    if (!data || data.status !== 'PENDING') return;
    const tick = () => {
      const diff = new Date(data.approval_deadline).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data]);

  async function handleAccept() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/ap/transfer/${escrowId}/accept`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) setData((prev) => (prev ? { ...prev, status: json.status } : prev));
    } finally {
      setBusy(false);
    }
  }

  async function handleDispute() {
    const reason = window.prompt('เหตุผลในการแจ้งข้อพิพาท');
    if (!reason) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/ap/transfer/${escrowId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (res.ok) setData((prev) => (prev ? { ...prev, status: json.status } : prev));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <div className="h-32 w-full max-w-sm animate-pulse rounded-2xl bg-[#1A1C2E]" />;
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-[#1A1C2E] p-6">
      <p className="mb-1 text-sm font-bold text-[#F9EDD8]">{data.amount_ap} AP</p>
      <p className="mb-4 text-xs text-[#94A3B8]">สถานะ: {data.status}</p>

      {data.status === 'PENDING' && (
        <>
          <p className="mb-4 text-sm font-bold text-[#F59E0B]">ผู้รับมีเวลา {timeLeft}</p>
          <div className="flex gap-2">
            {isReceiver && (
              <button type="button" disabled={busy} onClick={handleAccept} className="flex-1 rounded-lg bg-[#4CAF50] px-4 py-2 text-sm font-black text-white disabled:opacity-40">
                รับ AP
              </button>
            )}
            {isSender && (
              <button type="button" disabled={busy} onClick={handleDispute} className="flex-1 rounded-lg border border-[#E3322F] px-4 py-2 text-sm font-bold text-[#E3322F] disabled:opacity-40">
                แจ้งข้อพิพาท
              </button>
            )}
          </div>
        </>
      )}

      {data.status === 'COMPLETED' && <p className="text-sm font-bold text-[#4CAF50]">✓ รับ AP สำเร็จ</p>}
      {data.status === 'AUTO_RELEASED' && <p className="text-sm text-[#94A3B8]">ⓘ ปล่อย AP อัตโนมัติ</p>}
    </div>
  );
}
