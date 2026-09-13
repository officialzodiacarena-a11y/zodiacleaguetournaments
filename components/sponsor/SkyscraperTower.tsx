// components/sponsor/SkyscraperTower.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { SponsorBannerPublic, SponsorSlotPosition } from '@/types/sponsor';

interface SkyscraperTowerProps {
  position: Extract<SponsorSlotPosition, 'LEFT_TOWER' | 'RIGHT_TOWER'>;
  className?: string;
}

export function SkyscraperTower({ position, className = '' }: SkyscraperTowerProps) {
  const [banner, setBanner] = useState<SponsorBannerPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchTower() {
      try {
        const res = await fetch(`/api/v1/banners?slot_position=${position}`);
        if (!res.ok) throw new Error('Fetch failed');
        const json = await res.json();
        if (!isCancelled && json.data && json.data.length > 0) {
          setBanner(json.data[0]);
        }
      } catch (err) {
        console.error(`[SkyscraperTower ${position}] Load failed:`, err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchTower();

    return () => {
      isCancelled = true;
    };
  }, [position]);

  const trackEvent = useCallback((bannerId: string, eventType: 'IMPRESSION' | 'CLICK') => {
    try {
      fetch(`/api/v1/banners/${bannerId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType }),
        keepalive: true,
      }).catch((err) => console.error(`[SkyscraperTower] Track ${eventType} failed:`, err));
    } catch (err) {
      console.error(`[SkyscraperTower] Track ${eventType} error:`, err);
    }
  }, []);

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

  if (loading || !banner) return null;

  return (
    <aside
      ref={containerRef}
      className={`hidden 2xl:block fixed top-24 z-30 w-40 select-none ${
        position === 'LEFT_TOWER' ? 'left-4' : 'right-4'
      } ${className}`}
    >
      <Link
        href={banner.target_url}
        onClick={() => trackEvent(banner.id, 'CLICK')}
        className="group relative block w-40 h-[600px] rounded-xl overflow-hidden border border-white/10 bg-[#121424] hover:border-[#E8B429]/60 shadow-2xl transition-all duration-300"
      >
        <Image
          src={banner.image_url}
          alt={banner.title}
          fill
          unoptimized
          sizes="160px"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold text-[#E8B429]">
          AD
        </div>
      </Link>
    </aside>
  );
}