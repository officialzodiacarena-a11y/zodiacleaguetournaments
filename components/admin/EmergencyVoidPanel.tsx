'use client';

import { useState } from 'react';

// UI/UX Spec status: Pending Prototype — see PredictionPoolCard.tsx note.

export function EmergencyVoidPanel() {
  const [matchId, setMatchId] = useState('');
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleConfirmVoid() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/admin/matches/${matchId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResult(`❌ ${json.error?.message ?? 'ไม่สำเร็จ'}`);
      } else {
        setResult('✅ Void สำเร็จ — คืน AP ทุกฝ่ายแล้ว');
        setMatchId('');
        setReason('');
      }
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="rounded-xl bg-[#1A1C2E] p-5">
      <h3 className="mb-3 text-sm font-bold text-[#F9EDD8]">Void Match ฉุกเฉิน (SUPER_ADMIN)</h3>
      <input
        value={matchId}
        onChange={(e) => setMatchId(e.target.value)}
        placeholder="Match ID"
        className="mb-2 w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
      />
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เหตุผล (อย่างน้อย 3 ตัวอักษร)"
        className="mb-3 w-full rounded-lg bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8]"
        rows={2}
      />

      <button
        type="button"
        disabled={!matchId || reason.length < 3}
        onClick={() => setConfirmOpen(true)}
        className="w-full rounded-lg bg-[#E3322F] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
      >
        Void Match ฉุกเฉิน
      </button>

      {result && <p className="mt-3 text-xs text-[#94A3B8]">{result}</p>}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1A1C2E] p-6">
            <p className="mb-4 text-sm font-bold text-[#F9EDD8]">ยืนยันการ Void? ระบบจะคืน AP ทุกฝ่ายทันที</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 rounded-lg bg-[#12142A] px-4 py-2 text-sm text-[#94A3B8]">
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmVoid}
                className="flex-1 rounded-lg bg-[#E3322F] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
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
