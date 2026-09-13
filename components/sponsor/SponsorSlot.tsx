// components/sponsor/SponsorSlot.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { SponsorBannerPublic } from '@/types/sponsor';

interface SponsorSlotProps {
  className?: string;
}

export function SponsorSlot({ className = '' }: SponsorSlotProps) {
  const [banner, setBanner] = useState<SponsorBannerPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Active Top Leaderboard Banner
  useEffect(() => {
    let isCancelled = false;

    async function fetchBanner() {
      try {
        const res = await fetch('/api/v1/banners?slot_position=TOP_LEADERBOARD');
        if (!res.ok) throw new Error('Fetch failed');
        const json = await res.json();
        if (!isCancelled && json.data && json.data.length > 0) {
          setBanner(json.data[0]);
        }
      } catch (err) {
        console.error('[SponsorSlot] Load failed:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchBanner();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Track Event Function
  const trackEvent = useCallback((bannerId: string, eventType: 'IMPRESSION' | 'CLICK') => {
    try {
      fetch(`/api/v1/banners/${bannerId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType }),
        keepalive: true,
      }).catch((err) => console.error(`[SponsorSlot] Track ${eventType} failed:`, err));
    } catch (err) {
      console.error(`[SponsorSlot] Track ${eventType} error:`, err);
    }
  }, []);

  // 3. Telemetry Debounce: IntersectionObserver (Visible > 50% for > 1,000ms)
  useEffect(() => {
    if (!banner || hasTrackedImpression || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!timerRef.current) {
            timerRef.current = setTimeout(() => {
              trackEvent(banner.id, 'IMPRESSION');
              setHasTrackedImpression(true);
            }, 1000);
          }
        } else {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold: [0.5] }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [banner, hasTrackedImpression, trackEvent]);

  if (loading) {
    return (
      <div className={`w-full max-w-5xl mx-auto ${className}`}>
        <div className="w-full aspect-[970/120] max-h-28 rounded-xl border border-white/5 bg-[#121424] animate-pulse flex items-center justify-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
            SPONSOR SPOTLIGHT LOADING...
          </span>
        </div>
      </div>
    );
  }

  if (!banner) return null;

  return (
    <div ref={containerRef} className={`w-full max-w-5xl mx-auto select-none ${className}`}>
      <Link
        href={banner.target_url}
        onClick={() => trackEvent(banner.id, 'CLICK')}
        className="group relative block w-full aspect-[970/120] max-h-28 rounded-xl overflow-hidden border border-[#E8B429]/30 bg-[#121424] shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-[#E8B429] hover:shadow-[0_0_20px_rgba(232,180,41,0.2)] transition-all duration-300"
      >
        <Image
          src={banner.image_url}
          alt={banner.title}
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover group-hover:scale-[1.01] transition-transform duration-500"
          priority
        />
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider text-[#E8B429]">
          SPONSORED
        </div>
      </Link>
    </div>
  );
}