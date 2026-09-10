'use client';

import { useState } from 'react';

// UI/UX Spec status: Pending Prototype — see PredictionPoolCard.tsx note.

export function SettlePoolPanel() {
  const [poolId, setPoolId] = useState('');
  const [winningTeamId, setWinningTeamId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleConfirmSettle() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/admin/predictions/pools/${poolId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ winning_team_id: winningTeamId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult(`❌ ${json.error?.message ?? 'ไม่สำเร็จ'}`);
      } else {
        setResult(`✅ ${json.status} — Burn ${json.house_fee_burned ?? 0} AP, แจกจริง ${json.net_distributed ?? json.carried_to_jackpot ?? 0} AP`);
        setPoolId('');
        setWinningTeamId('');
      }
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="rounded-xl bg-[#1A1C2E] p-5">
      <h3 className="mb-3 text-sm font-bold text-[#F9EDD8]">ตัดสินผล Pool (ADMIN / SUPER_ADMIN)</h3>
      <input
        value={poolId}
        onChange={(e) => setPoolId(e.target.value)}
        placeholder="Pool ID"
        className="mb-2 w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
      />
      <input
        value={winningTeamId}
        onChange={(e) => setWinningTeamId(e.target.value)}
        placeholder="Winning Team ID"
        className="mb-3 w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
      />
      <button
        type="button"
        disabled={!poolId || !winningTeamId}
        onClick={() => setConfirmOpen(true)}
        className="w-full rounded-lg bg-[#E8B429] px-4 py-2 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
      >
        ตัดสินผล
      </button>

      {result && <p className="mt-3 text-xs text-[#94A3B8]">{result}</p>}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1A1C2E] p-6">
            <p className="mb-4 text-sm font-bold text-[#F9EDD8]">ยืนยันการตัดสินผล Pool นี้?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 rounded-lg bg-[#12142A] px-4 py-2 text-sm text-[#94A3B8]">
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmSettle}
                className="flex-1 rounded-lg bg-[#E8B429] px-4 py-2 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
              >
                {busy ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
