'use client';

import { useEffect, useState } from 'react';

// UI/UX Spec status: Pending Prototype — see StorefrontManager.tsx note.
// floor_price is never fetched, stored in state, or passed as a prop anywhere
// in this component tree — the API never returns it (Zero-Leak by construction).

interface AuctionListingCardProps {
  listingId: string;
  itemTitle: string;
  currentHighestBid: number | null;
  buyoutPrice: number | null;
  auctionEndsAt: string | null;
  status: string;
  myPlayerId?: string;
  myBidderId?: string | null;
}

type ToastState = { kind: 'success' | 'info' | 'error'; message: string } | null;

export function AuctionListingCard({ listingId, itemTitle, currentHighestBid, buyoutPrice, auctionEndsAt, status, myPlayerId, myBidderId }: AuctionListingCardProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [localStatus, setLocalStatus] = useState(status);
  const [localHighest, setLocalHighest] = useState(currentHighestBid);

  useEffect(() => {
    if (!auctionEndsAt) return;
    const tick = () => {
      const diff = new Date(auctionEndsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('หมดเวลา');
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
  }, [auctionEndsAt]);

  async function handleBid() {
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) return;
    setSubmitting(true);
    setToast(null);
    try {
      const res = await fetch(`/api/v1/marketplace/listings/${listingId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bid_amount: amount, idempotency_key: crypto.randomUUID() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ kind: 'error', message: json.error?.code === 'BID_TOO_LOW' ? 'ราคาต้องสูงกว่าราคาปัจจุบัน' : 'ไม่สามารถเสนอราคาได้' });
        return;
      }
      if (json.matched) {
        setLocalStatus('SOLD');
        setToast({ kind: 'success', message: 'ซื้อสำเร็จ!' });
      } else {
        setLocalHighest(amount);
        setToast({ kind: 'info', message: 'บันทึกราคาแล้ว' });
      }
      setBidAmount('');
    } catch {
      setToast({ kind: 'error', message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ' });
    } finally {
      setSubmitting(false);
    }
  }

  const isSold = localStatus === 'SOLD';
  const iAmLeading = Boolean(myPlayerId && myBidderId && myPlayerId === myBidderId);

  return (
    <div className="relative rounded-xl bg-[#1A1C2E] p-4">
      {isSold && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/60">
          <span className="rounded-full bg-gray-700 px-4 py-1 text-sm font-bold text-white">ขายแล้ว</span>
        </div>
      )}

      <p className="mb-2 font-bold text-[#F9EDD8]">{itemTitle}</p>

      {iAmLeading && (
        <span className="mb-2 inline-block rounded-full bg-[#9184D9]/20 px-2 py-0.5 text-[10px] font-bold text-[#9184D9]">คุณนำอยู่</span>
      )}

      <p className="text-xl font-bold text-[#E8B429]">
        {localHighest != null ? `ราคาปัจจุบัน: ${localHighest} AP` : 'ยังไม่มีผู้เสนอราคา'}
      </p>
      {buyoutPrice != null && <p className="text-sm text-[#F9EDD8]">ซื้อทันที: {buyoutPrice} AP</p>}
      {timeLeft && <p className="mt-1 text-sm font-bold text-[#E3322F]">หมดเวลาใน {timeLeft}</p>}

      {!isSold && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="ใส่ราคา AP"
            className="w-full rounded-lg border border-[#E8B429]/30 bg-[#12142A] px-3 py-2 text-sm text-[#F9EDD8] focus:border-[#E8B429] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleBid}
            disabled={submitting || !bidAmount}
            className="shrink-0 rounded-lg bg-[#E8B429] px-4 py-2 text-sm font-black text-[#0D0E1A] disabled:opacity-40"
          >
            {submitting ? '...' : 'เสนอราคา'}
          </button>
        </div>
      )}

      {toast && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            toast.kind === 'success' ? 'bg-[#4CAF50]/15 text-[#4CAF50]' : toast.kind === 'error' ? 'bg-[#E3322F]/15 text-[#E3322F]' : 'bg-[#94A3B8]/15 text-[#94A3B8]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
