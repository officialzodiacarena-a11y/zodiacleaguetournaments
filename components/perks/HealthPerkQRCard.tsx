'use client';

import { useEffect, useRef, useState } from 'react';

// UI/UX Spec status: Pending Prototype sign-off — see SubscriptionCheckoutModal.tsx note.

interface HealthPerkQRCardProps {
  perkId: string;
  redeemedByPlayerId: string;
  maxQuotaAmount: number;
  amountUsed: number;
}

interface GenerateQrResponse {
  redemption_id: string;
  perk_token: string;
  qr_payload: string;
  expires_at: string;
  remaining_quota: number;
}

type CardState = 'idle' | 'loading' | 'active' | 'expired' | 'error' | 'quota_full';

export function HealthPerkQRCard({ perkId, redeemedByPlayerId, maxQuotaAmount, amountUsed }: HealthPerkQRCardProps) {
  const [state, setState] = useState<CardState>(amountUsed >= maxQuotaAmount ? 'quota_full' : 'idle');
  const [qr, setQr] = useState<GenerateQrResponse | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const remaining = maxQuotaAmount - amountUsed;

  useEffect(() => {
    if (state !== 'active' || !qr) return;
    const expiresAt = new Date(qr.expires_at).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setState('expired');
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state, qr]);

  useEffect(() => {
    if (state !== 'active' || !qr || !canvasRef.current) return;
    import('qrcode')
      .then((QRCode) => QRCode.toCanvas(canvasRef.current, qr.qr_payload, { width: 220, margin: 1 }))
      .catch(() => setState('error'));
  }, [state, qr]);

  async function handleGenerate() {
    setState('loading');
    try {
      const res = await fetch('/api/v1/perks/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perk_id: perkId, redeemed_by_player_id: redeemedByPlayerId, redeem_amount: remaining }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState(json.error?.code === 'QUOTA_EXCEEDED' ? 'quota_full' : 'error');
        return;
      }
      setQr(json);
      setState('active');
    } catch {
      setState('error');
    }
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="w-full max-w-sm rounded-2xl bg-[#1A1C2E] p-6 text-center">
      <p className="mb-1 text-sm font-bold text-[#F9EDD8]">VIP Health Perk — หัตถแพทย์</p>
      <p className="mb-4 text-xs text-[#94A3B8]">เหลือ ฿{remaining.toLocaleString()} จากโควตา ฿{maxQuotaAmount.toLocaleString()}</p>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[#12142A]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#E8B429] to-[#d97706] transition-all duration-300"
          style={{ width: `${Math.min(100, (amountUsed / maxQuotaAmount) * 100)}%` }}
        />
      </div>

      {state === 'quota_full' && (
        <div className="rounded-lg bg-[#12142A] py-6 text-sm text-[#94A3B8]">ใช้ครบโควตาแล้ว</div>
      )}

      {(state === 'idle' || state === 'error') && (
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full rounded-lg bg-[#E8B429] px-6 py-2.5 text-sm font-black text-[#0D0E1A]"
        >
          สร้าง QR Code
        </button>
      )}

      {state === 'error' && <p className="mt-2 text-xs text-[#E3322F]">เกิดข้อผิดพลาด กรุณาลองใหม่</p>}

      {state === 'loading' && <div className="h-[220px] w-full animate-pulse rounded-lg bg-[#12142A]" />}

      {state === 'active' && (
        <div>
          <div className="mx-auto mb-3 flex h-[220px] w-[220px] items-center justify-center rounded-lg bg-white p-2">
            <canvas ref={canvasRef} />
          </div>
          <p className="text-sm font-bold text-[#E3322F]">หมดอายุใน {mm}:{ss}</p>
        </div>
      )}

      {state === 'expired' && (
        <div>
          <div className="mb-3 flex h-[220px] w-full items-center justify-center rounded-lg bg-[#12142A] text-sm text-[#94A3B8]">
            QR หมดอายุ กรุณาสร้างใหม่
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="w-full rounded-lg bg-[#E8B429] px-6 py-2.5 text-sm font-black text-[#0D0E1A]"
          >
            สร้าง QR ใหม่
          </button>
        </div>
      )}
    </div>
  );
}
