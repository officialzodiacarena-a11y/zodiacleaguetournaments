// components/sponsor/OfficialSponsorsBar.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { SponsorBannerPublic } from '@/types/sponsor';

const FALLBACK_LOGO_SRC = '/images/logo/logo.png';
const MAX_SPONSORS = 6;

export function OfficialSponsorsBar() {
  const [banners, setBanners] = useState<SponsorBannerPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchBanners() {
      try {
        const res = await fetch('/api/v1/banners?slot_position=OFFICIAL_SPONSORS_BAR');
        if (!res.ok) throw new Error('Fetch failed');
        const json = await res.json();
        if (!isCancelled && Array.isArray(json.data)) {
          setBanners(json.data.slice(0, MAX_SPONSORS));
        }
      } catch (err) {
        console.error('[OfficialSponsorsBar] Load failed:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchBanners();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (loading) return null;

  return (
    <div className="w-full max-w-7xl mx-auto my-8 space-y-3">
      <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest px-1">
        <ShieldCheck className="w-4 h-4 text-[#00D4FF]" />
        <span>OFFICIAL PARTNERS & ECOSYSTEM SPONSORS</span>
      </div>

      {banners.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-white/10 bg-[#121424]/80 p-6">
          <div className="relative w-16 h-16">
            <Image src={FALLBACK_LOGO_SRC} alt="Zodiac Arena" fill sizes="64px" className="object-contain" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {banners.map((item) => (
            <Link
              key={item.id}
              href={item.target_url}
              className="group relative rounded-xl border border-white/10 bg-[#121424]/80 p-3 hover:border-[#00D4FF]/50 hover:bg-[#1A1C30] transition-all duration-300 flex flex-col items-center justify-between text-center space-y-2"
            >
              <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/5 bg-[#0D0E1A]">
                <Image
                  src={item.image_url}
                  alt={item.brand_name ?? item.title}
                  fill
                  sizes="(max-width: 768px) 120px, 160px"
                  className="object-contain p-1.5 group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="space-y-1 w-full">
                <span className="text-[11px] font-bold text-zinc-200 line-clamp-1 group-hover:text-[#00D4FF] transition-colors block">
                  {item.brand_name ?? item.title}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
