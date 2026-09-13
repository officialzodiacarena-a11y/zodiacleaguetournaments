'use client';

import { useEffect, useState } from 'react';
import { StoreHeader } from '@/components/store/StoreHeader';
import { CategoryFilter } from '@/components/store/CategoryFilter';
import { SINOPECBanner } from '@/components/store/SINOPECBanner';
import { ProductCard } from '@/components/store/ProductCard';
import { SponsorSlot } from '@/components/sponsor/SponsorSlot';
// ด้านใน return:
<div className="mx-auto max-w-6xl space-y-6 p-6">
  <SponsorSlot />
  <StoreHeader />
  {/* เนื้อหา Store อื่นๆ */}
</div>

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

export function StoreClient() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const query = activeSlug ? `?category=${encodeURIComponent(activeSlug)}` : '';
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return fetch(`/api/v1/store/items${query}`);
      })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error.message ?? 'โหลดสินค้าไม่สำเร็จ');
        setItems(json.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <StoreHeader />
      <SINOPECBanner />
      <CategoryFilter activeSlug={activeSlug} onSelect={setActiveSlug} />

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-[#1A1C2E]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#94A3B8]">ยังไม่มีสินค้าในหมวดหมู่นี้</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
