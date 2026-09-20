import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Sparkles } from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  price_ap: number;
  price_thb: number;
  sold_out: boolean;
}

interface StoreItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  item_type: string | null;
  partner_brand: string | null;
  variants: Variant[];
}

export function ProductCard({ item }: { item: StoreItem }) {
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const variant = item.variants[0];

  async function handleRedeem() {
    if (!variant || variant.sold_out || redeeming) return;
    setRedeeming(true);
    setResult(null);
    try {
      const orderRes = await fetch('/api/v1/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ items: { [variant.id]: 1 } }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderJson.error?.message ?? 'สร้างคำสั่งซื้อไม่สำเร็จ');

      const checkoutRes = await fetch(`/api/v1/store/orders/${orderJson.order_id}/checkout`, { method: 'POST' });
      const checkoutJson = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutJson.error?.message ?? 'แลกสินค้าไม่สำเร็จ');

      setResult({ ok: true, message: `แลกสำเร็จ! ใช้ไป ${checkoutJson.ap_deducted} AP` });
    } catch (err: unknown) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' });
    } finally {
      setRedeeming(false);
    }
  }

  const isLuminary = item.partner_brand?.toUpperCase().includes('LUMINARY') || !item.partner_brand || item.partner_brand === 'SINOPEC';
  const partnerSlug = 'luminary';

  return (
    <div className="flex flex-col rounded-xl bg-[#1A1C2E] p-4 border border-white/5 hover:border-[#E8B429]/40 transition-all shadow-lg">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isLuminary ? (
            <span className="rounded-full bg-[#E8B429]/15 border border-[#E8B429]/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#E8B429]">
              LUMINARY GLOBAL
            </span>
          ) : item.partner_brand ? (
            <span className="rounded-full bg-[#00D4FF]/15 border border-[#00D4FF]/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#00D4FF]">
              {item.partner_brand}
            </span>
          ) : null}

          {item.item_type && (
            <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#94A3B8]">
              {item.item_type}
            </span>
          )}
        </div>
      </div>

      <h3 className="mb-1 text-sm font-bold text-[#F9EDD8]">{item.name}</h3>
      {item.description && <p className="mb-3 line-clamp-2 text-xs text-[#94A3B8]">{item.description}</p>}

      {variant && (
        <div className="mt-auto space-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-[#E8B429]">{variant.price_ap.toLocaleString()}</span>
            <span className="text-xs text-[#94A3B8]">AP · ≈ ฿{variant.price_thb}</span>
          </div>
          <button
            type="button"
            disabled={variant.sold_out || redeeming}
            onClick={handleRedeem}
            className="w-full rounded-lg bg-[#E8B429] hover:bg-[#f5c84c] py-2 text-xs font-black text-[#0D0E1A] disabled:opacity-40 transition-colors cursor-pointer"
          >
            {variant.sold_out ? 'สินค้าหมด' : redeeming ? 'กำลังแลก...' : 'แลกเลย'}
          </button>
          
          {/* Link ใต้สินค้า ไปยังหน้าสปอนเซอร์ */}
          <div className="pt-1 text-center">
            <Link
              href={`/sponsor/${partnerSlug}`}
              className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-[#E8B429] transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#E8B429]" />
              <span>ดูข้อมูลแบรนด์ & สิทธิพิเศษ</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>

          {result && (
            <p className={`text-[11px] ${result.ok ? 'text-[#4CAF50]' : 'text-red-400'}`}>{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
