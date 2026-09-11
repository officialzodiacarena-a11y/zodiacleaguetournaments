'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface VoucherDeliveryProps {
  inventoryId: string;
  onClose: () => void;
}

// Shows the digital voucher QR right after a successful redeem. The QR
// encodes a 5-minute signed token (lib/store/voucherToken.ts) proving
// ownership of this player_inventory row — SINOPEC scans it at the pump.
// Note: there's no partner-facing scan/redeem endpoint yet (player_inventory
// has no status/redeemed_at column to flip — see the token route's comment),
// so this component covers issuance + display only.
export function VoucherDelivery({ inventoryId, onClose }: VoucherDeliveryProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/store/vouchers/${inventoryId}/token`)
      .then((r) => r.json())
      .then(async (json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error.message ?? 'ออกคูปองไม่สำเร็จ');
        const dataUrl = await QRCode.toDataURL(json.token, { margin: 1, width: 240 });
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        setExpiresAt(json.expires_at);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      });
    return () => {
      cancelled = true;
    };
  }, [inventoryId]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#1A1C2E] p-6 text-center">
        <h3 className="mb-1 text-sm font-black text-[#F9EDD8]">Digital Voucher QR</h3>
        <p className="mb-4 text-xs text-[#94A3B8]">แสดง QR นี้ที่ปั๊ม SINOPEC เพื่อใช้สิทธิ์</p>

        {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

        {qrDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived data: URI, not worth Image's optimizer */}
            <img src={qrDataUrl} alt="Voucher QR Code" className="mx-auto mb-3 h-60 w-60 rounded-lg bg-white p-2" />
            <p className={`text-xs font-bold ${secondsLeft <= 30 ? 'text-red-400' : 'text-[#94A3B8]'}`}>
              {secondsLeft > 0 ? `หมดอายุใน ${secondsLeft} วินาที` : 'QR หมดอายุแล้ว — กรุณาเปิดใหม่'}
            </p>
          </>
        ) : (
          !error && <div className="mx-auto mb-3 h-60 w-60 animate-pulse rounded-lg bg-white/10" />
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-white/10 py-2 text-xs font-bold text-[#F9EDD8]"
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
