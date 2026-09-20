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

  const isLeft = position === 'LEFT_TOWER';
  const defaultBanner: SponsorBannerPublic = {
    id: isLeft ? 'default-tower-left' : 'default-tower-right',
    title: 'Luminary Global - Official Title Sponsor',
    slot_position: position,
    image_url: '/images/sponser/tier1_title_sponsor_canva.png',
    target_url: 'https://luminaryglobal.com',
    brand_name: 'LUMINARY GLOBAL',
    priority: 100,
  };

  const activeBanner = banner || defaultBanner;

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
      if (typeof window !== 'undefined' && navigator.sendBeacon && eventType === 'CLICK') {
        const blob = new Blob([JSON.stringify({ event_type: eventType })], {
          type: 'application/json',
        });
        navigator.sendBeacon(`/api/v1/banners/${bannerId}/track`, blob);
      } else {
        fetch(`/api/v1/banners/${bannerId}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_type: eventType }),
          keepalive: true,
        }).catch((err) => console.error(`[SkyscraperTower] Track ${eventType} failed:`, err));
      }
    } catch (err) {
      console.error(`[SkyscraperTower] Track ${eventType} error:`, err);
    }
  }, []);

  useEffect(() => {
    if (!activeBanner || hasTrackedImpression || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!timerRef.current) {
            timerRef.current = setTimeout(() => {
              trackEvent(activeBanner.id, 'IMPRESSION');
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
  }, [activeBanner, hasTrackedImpression, trackEvent]);

  if (loading && !banner) return null;

  return (
    <aside
      ref={containerRef}
      aria-label={`Sponsor Skyscraper ${isLeft ? 'Left' : 'Right'}`}
      className={`hidden min-[1380px]:block fixed top-24 z-30 w-32 xl:w-36 2xl:w-40 select-none ${
        isLeft ? 'left-2 xl:left-4 2xl:left-6' : 'right-2 xl:right-4 2xl:right-6'
      } ${className}`}
    >
      <Link
        href={activeBanner.target_url}
        onClick={() => trackEvent(activeBanner.id, 'CLICK')}
        className={`group relative block w-32 xl:w-36 2xl:w-40 h-[500px] xl:h-[580px] 2xl:h-[620px] rounded-xl overflow-hidden bg-[#121424] border transition-all duration-300 ${
          isLeft
            ? 'border-[#00D4FF]/30 shadow-[0_0_25px_rgba(0,212,255,0.12)] hover:border-[#00D4FF] hover:shadow-[0_0_30px_rgba(0,212,255,0.3)]'
            : 'border-[#E8B429]/30 shadow-[0_0_25px_rgba(232,180,41,0.12)] hover:border-[#E8B429] hover:shadow-[0_0_30px_rgba(232,180,41,0.3)]'
        }`}
      >
        <Image
          src={activeBanner.image_url}
          alt={activeBanner.title}
          fill
          sizes="(max-width: 1536px) 144px, 160px"
          className="object-cover group-hover:scale-105 group-hover:brightness-110 transition-all duration-500"
        />

        {/* Shine Sweep Overlay */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* Minimalist Cyber Badge */}
        <div
          className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-widest backdrop-blur-md border ${
            isLeft
              ? 'bg-[#0A0A0F]/80 text-[#00D4FF] border-[#00D4FF]/40'
              : 'bg-[#0A0A0F]/80 text-[#E8B429] border-[#E8B429]/40'
          }`}
        >
          {activeBanner.brand_name ? activeBanner.brand_name.toUpperCase() : 'SPONSOR'}
        </div>
      </Link>
    </aside>
  );
}