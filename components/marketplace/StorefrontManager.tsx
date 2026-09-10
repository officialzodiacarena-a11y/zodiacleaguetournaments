'use client';

import { useEffect, useState } from 'react';

// UI/UX Spec status: MASTER_SPEC___Stage2_P6_UI_UX.md is "⏳ Pending Prototype"
// (พี่ศิลา ยังไม่ได้ส่ง Prototype A/B/C ให้อลิสเลือก) — implement ตาม Design
// Tokens ที่ให้มาครบ แต่คาดว่าต้องมีรอบ polish อีกครั้งหลัง sign-off

interface ListingSlot {
  listing_id: string;
  item_title: string;
  status: string;
  is_paid_slot: boolean;
}

interface StorefrontManagerProps {
  vendorId: string;
}

export function StorefrontManager({ vendorId }: StorefrontManagerProps) {
  const [slots, setSlots] = useState<ListingSlot[]>([]);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/v1/marketplace/listings?vendor_id=${vendorId}&limit=10`).then((r) => r.json()),
      fetch(`/api/v1/marketplace/vendors/${vendorId}`).then((r) => r.json()),
    ])
      .then(([listingsRes, vendorRes]) => {
        if (cancelled) return;
        setSlots((listingsRes.listings ?? []).map((l: { listing_id: string; item_title?: string; status: string }) => ({
          listing_id: l.listing_id,
          item_title: l.item_title ?? 'สินค้า',
          status: l.status,
          is_paid_slot: false,
        })));
        if (typeof vendorRes.monthly_listing_count === 'number') setMonthlyCount(vendorRes.monthly_listing_count);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 bg-[#0D0E1A] p-6 sm:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[#1A1C2E]" />
        ))}
      </div>
    );
  }

  const filledCount = slots.length;
  const isFull = filledCount >= 10;
  const isMonthlyCap = (monthlyCount ?? 0) >= 30;

  return (
    <div className="bg-[#0D0E1A] p-6">
      {monthlyCount !== null && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-[#94A3B8]">
            <span>{monthlyCount}/30 ชิ้นใช้แล้วเดือนนี้</span>
            {isMonthlyCap && <span className="text-[#F59E0B]">ครบ 30 ชิ้น/เดือน — Upgrade เพื่อลงต่อ</span>}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#12142A]">
            <div className="h-full rounded-full bg-[#E8B429] transition-all duration-300" style={{ width: `${Math.min(100, (monthlyCount / 30) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {slots.map((slot) => (
          <div
            key={slot.listing_id}
            className={`rounded-xl border-2 bg-[#1A1C2E] p-3 transition-colors ${
              slot.status === 'UNPUBLISHED_OVERDUE' ? 'border-[#E3322F]' : 'border-[#334B5C] hover:border-[#E8B429]'
            }`}
          >
            <p className="truncate text-xs font-bold text-[#F9EDD8]">{slot.item_title}</p>
            <p className="mt-1 text-[10px] text-[#94A3B8]">{slot.status}</p>
            {slot.is_paid_slot && (
              <span className="mt-2 inline-block rounded-full bg-[#9184D9]/20 px-2 py-0.5 text-[9px] font-bold text-[#9184D9]">Paid Slot</span>
            )}
            {slot.status === 'UNPUBLISHED_OVERDUE' && (
              <span className="mt-2 inline-block rounded-full bg-[#E3322F]/20 px-2 py-0.5 text-[9px] font-bold text-[#E3322F]">ค้างชำระ</span>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 10 - filledCount) }).map((_, i) => (
          <div key={`empty-${i}`} className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-[#334B5C] text-xs text-[#94A3B8]">
            ว่าง
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={isFull}
        title={isFull ? 'วางขายพร้อมกันครบแล้ว' : undefined}
        className="mt-4 rounded-lg bg-[#E8B429] px-6 py-2 text-sm font-black text-[#0D0E1A] disabled:cursor-not-allowed disabled:opacity-40"
      >
        ลงสินค้า
      </button>
    </div>
  );
}
