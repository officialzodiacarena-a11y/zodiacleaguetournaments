// components/sponsor/SkyscraperTower.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Crown, ExternalLink, Sparkles } from 'lucide-react';
import type { SponsorBannerPublic, SponsorSlotPosition } from '@/types/sponsor';

interface SkyscraperTowerProps {
  position: Extract<SponsorSlotPosition, 'LEFT_TOWER' | 'RIGHT_TOWER'>;
  className?: string;
}

const SEASON_CARDS = [
  {
    id: 'zodiac-league',
    name: 'ZODIAC LEAGUE',
    seasonTag: 'ANNUAL FINALS',
    statusTag: 'TOP 12 CLASH',
    image: '/images/seasons/zodiacT1Y.jpg',
    borderColor: '#9184D9',
    glowColor: 'rgba(145, 132, 217, 0.35)',
    textColor: 'text-purple-300',
    tagBg: 'bg-[#9184D9]/80 text-purple-100 border-[#9184D9]',
    statusBg: 'text-amber-300 bg-black/70 border-amber-400/40',
    title: 'GRAND CHAMPIONSHIP',
    subtitle: 'มหาศึกรวม 12 ราศีส่งท้ายปี',
    footerTop: 'TOTAL PRIZE POOL',
    footerBottom: 'ANNUAL GLORY',
    icon: 'crown',
  },
  {
    id: 'spring',
    name: 'SPRING',
    seasonTag: 'SEASON 1 • JAN-MAR',
    statusTag: 'CHAMPION',
    image: '/images/seasons/Spring.jpg',
    borderColor: '#63A66F',
    glowColor: 'rgba(99, 166, 111, 0.35)',
    textColor: 'text-emerald-300',
    tagBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-400/60',
    statusBg: 'text-amber-300 bg-black/70 border-amber-400/40',
    title: 'SPRING',
    subtitle: 'CONCLUDED • 64W - 41L',
    footerTop: '🏆 ZODIAC APEX',
    footerBottom: '1st SEED CHAMPION',
    icon: 'sakura',
  },
  {
    id: 'summer',
    name: 'SUMMER',
    seasonTag: 'SEASON 2 • APR-JUN',
    statusTag: 'LIVE',
    image: '/images/seasons/Summer.jpg',
    borderColor: '#E8B429',
    glowColor: 'rgba(232, 180, 41, 0.35)',
    textColor: 'text-[#FFF4CC]',
    tagBg: 'bg-amber-950/90 text-[#E8B429] border-amber-400/60',
    statusBg: 'bg-red-600/90 text-white border-red-400 animate-pulse',
    title: 'SUMMER',
    subtitle: 'LIVE TOURNAMENT PHASE',
    footerTop: 'ATHLETE ACCESS',
    footerBottom: 'S2 ACTIVE CIRCUIT',
    icon: 'sun',
  },
  {
    id: 'fall',
    name: 'FALL',
    seasonTag: 'SEASON 3 • JUL-SEP',
    statusTag: 'NEXT',
    image: '/images/seasons/Fall.jpg',
    borderColor: '#E87529',
    glowColor: 'rgba(232, 117, 41, 0.35)',
    textColor: 'text-orange-400',
    tagBg: 'bg-orange-950/90 text-orange-300 border-orange-400/60',
    statusBg: 'text-orange-300 bg-black/70 border-orange-400/40',
    title: 'FALL',
    subtitle: 'UPCOMING CIRCUIT',
    footerTop: 'REGISTRATION OPENS',
    footerBottom: 'JULY 2026',
    icon: 'leaf',
  },
  {
    id: 'winter',
    name: 'WINTER',
    seasonTag: 'SEASON 4 • OCT-DEC',
    statusTag: 'LOCKED',
    image: '/images/seasons/Winter.jpg',
    borderColor: '#5BA8D4',
    glowColor: 'rgba(91, 168, 212, 0.35)',
    textColor: 'text-cyan-300',
    tagBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-400/60',
    statusBg: 'text-cyan-300 bg-black/70 border-cyan-400/40',
    title: 'WINTER',
    subtitle: 'FINAL QUALIFIER',
    footerTop: 'LAST CHANCE POINTS',
    footerBottom: 'OCTOBER 2026',
    icon: 'snowflake',
  },
];

export function SkyscraperTower({ position, className = '' }: SkyscraperTowerProps) {
  const [banner, setBanner] = useState<SponsorBannerPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const [seasonIndex, setSeasonIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isLeft = position === 'LEFT_TOWER';
  const logoSrc = '/images/sponser/luminary_global.jpg';

  const defaultBanner: SponsorBannerPublic = {
    id: isLeft ? 'default-tower-left' : 'default-tower-right',
    title: 'Luminary Global - Official Title Sponsor',
    slot_position: position,
    image_url: logoSrc,
    target_url: '/sponsor/luminary',
    brand_name: 'LUMINARY GLOBAL',
    priority: 100,
  };

  const activeBanner = banner || defaultBanner;
  const [imgError, setImgError] = useState(false);
  const imgSrc = imgError ? logoSrc : (activeBanner.image_url || logoSrc);

  // Auto-rotate Right Tower every 10 seconds (5 Season Cards)
  useEffect(() => {
    if (isLeft) return;
    const interval = setInterval(() => {
      setSeasonIndex((prev) => (prev + 1) % SEASON_CARDS.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [isLeft]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchTower() {
      try {
        const res = await fetch(`/api/v1/banners?slot_position=${position}`);
        if (!res.ok) throw new Error('Fetch failed');
        const json = await res.json();
        if (!isCancelled && json.data && json.data.length > 0) {
          const item = json.data[0];
          if (item.brand_name?.toUpperCase().includes('SINOPEC')) {
            item.brand_name = 'LUMINARY GLOBAL';
            item.image_url = logoSrc;
          }
          setBanner(item);
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
  }, [position, logoSrc]);

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

  const currentSeason = SEASON_CARDS[seasonIndex];

  return (
    <aside
      ref={containerRef}
      aria-label={`Sponsor Skyscraper ${isLeft ? 'Left' : 'Right'}`}
      className={`hidden lg:block absolute top-4 z-20 w-[154px] xl:w-[198px] 2xl:w-[220px] select-none pointer-events-auto ${
        isLeft ? 'left-2 xl:left-4 2xl:left-8' : 'right-2 xl:right-4 2xl:right-8'
      } ${className}`}
    >
      {isLeft ? (
        /* ================= LEFT TOWER: SPONSOR (LUMINARY GLOBAL) ================= */
        <Link
          href={activeBanner.target_url}
          onClick={() => trackEvent(activeBanner.id, 'CLICK')}
          className="group relative flex flex-col justify-between w-full h-[390px] xl:h-[420px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#151728] via-[#0E101E] to-[#0A0B14] border border-[#E8B429]/40 shadow-[0_0_25px_rgba(232,180,41,0.12)] hover:border-[#E8B429] hover:shadow-[0_0_35px_rgba(232,180,41,0.35)] transition-all duration-300 p-4"
        >
          {/* Subtle Background Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#E8B429]/10 via-transparent to-transparent pointer-events-none" />

          {/* 1. Header Badge */}
          <div className="relative z-10 flex flex-col items-center gap-1 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8B429]/15 border border-[#E8B429]/50 text-[9px] xl:text-[10px] font-mono font-bold text-[#E8B429] tracking-wider uppercase shadow-sm">
              <Crown className="w-3.5 h-3.5 text-[#E8B429]" />
              <span>TITLE SPONSOR</span>
            </div>
            <span className="text-[8px] xl:text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
              ZODIAC ARENA S2
            </span>
          </div>

          {/* 2. Center Logo Frame */}
          <div className="relative z-10 my-auto flex flex-col items-center gap-3">
            <div className="relative w-[104px] h-[104px] xl:w-[116px] xl:h-[116px] rounded-2xl overflow-hidden border-2 border-[#E8B429]/60 shadow-[0_0_20px_rgba(232,180,41,0.25)] bg-white p-1.5 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
              <Image
                src={imgSrc}
                alt="Luminary Global"
                fill
                sizes="120px"
                className="object-contain p-1"
                priority
                onError={() => setImgError(true)}
              />
            </div>

            <div className="text-center px-1">
              <h4 className="text-sm xl:text-base font-black text-white tracking-wide uppercase group-hover:text-[#E8B429] transition-colors leading-tight">
                LUMINARY
              </h4>
              <h4 className="text-sm xl:text-base font-black text-[#E8B429] tracking-wider uppercase leading-tight">
                GLOBAL
              </h4>
              <p className="text-[9px] font-sans text-zinc-400 mt-1 line-clamp-2 leading-tight">
                Clean Spaces • Better Life
              </p>
            </div>
          </div>

          {/* 3. Bottom CTA Link */}
          <div className="relative z-10 w-full pt-2 border-t border-white/10 text-center">
            <div className="inline-flex items-center gap-1.5 text-[9px] xl:text-[10px] font-mono font-bold text-zinc-400 group-hover:text-[#E8B429] transition-colors">
              <Sparkles className="w-3 h-3 text-[#E8B429]" />
              <span>VISIT PARTNER</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </div>
          </div>

          {/* Shine Sweep Overlay */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        </Link>
      ) : (
        /* ================= RIGHT TOWER: 5-SEASON ROTATING CARDS (10s CYCLE) ================= */
        <Link
          key={currentSeason.id}
          href="/tournament"
          onClick={() => trackEvent(activeBanner.id, 'CLICK')}
          style={{ borderColor: currentSeason.borderColor }}
          className="group relative flex flex-col justify-between w-full h-[390px] xl:h-[420px] rounded-2xl overflow-hidden bg-zinc-950/25 transition-all duration-700 hover:-translate-y-1 shadow-[0_4px_25px_rgba(0,0,0,0.7)] p-3.5 animate-fadeIn"
        >
          {/* Background Image */}
          <div className="absolute inset-0 -z-10">
            <Image
              src={currentSeason.image}
              alt={currentSeason.name}
              fill
              sizes="220px"
              className="object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
              priority
            />
          </div>

          {/* Laser Corner Brackets */}
          <div 
            className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-xl pointer-events-none" 
            style={{ borderColor: currentSeason.borderColor }}
          />
          <div 
            className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-xl pointer-events-none" 
            style={{ borderColor: currentSeason.borderColor }}
          />
          <div 
            className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-xl pointer-events-none" 
            style={{ borderColor: currentSeason.borderColor }}
          />
          <div 
            className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-xl pointer-events-none" 
            style={{ borderColor: currentSeason.borderColor }}
          />

          {/* Top Info Header */}
          <div>
            <div className="flex justify-between items-center text-[8.5px] xl:text-[9px] font-mono tracking-widest mb-1">
              <span className={`px-1.5 py-0.5 rounded border font-bold ${currentSeason.tagBg}`}>
                {currentSeason.seasonTag}
              </span>
              <span className={`px-1.5 py-0.5 rounded border font-bold ${currentSeason.statusBg}`}>
                {currentSeason.statusTag}
              </span>
            </div>

            {/* Icon Render */}
            <div 
              className="w-8 h-8 mx-auto my-2.5 transition-transform duration-500 group-hover:scale-110"
              style={{ color: currentSeason.borderColor }}
            >
              {currentSeason.icon === 'crown' && <CrownIcon />}
              {currentSeason.icon === 'sakura' && <SakuraIcon />}
              {currentSeason.icon === 'sun' && <SunIcon />}
              {currentSeason.icon === 'leaf' && <LeafIcon />}
              {currentSeason.icon === 'snowflake' && <SnowflakeIcon />}
            </div>

            {/* Season Title */}
            <div className="text-center my-0.5">
              <h2 className={`text-lg xl:text-xl font-black tracking-tight leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] font-mono ${currentSeason.textColor}`}>
                {currentSeason.name}
              </h2>
              <p className="text-[8px] xl:text-[8.5px] text-zinc-100 tracking-widest uppercase font-black mt-1 drop-shadow line-clamp-1">
                {currentSeason.subtitle}
              </p>
            </div>
          </div>

          {/* Bottom Card Strip + 10s Dot Indicators */}
          <div className="space-y-1.5">
            <div 
              className="bg-black/85 backdrop-blur-md rounded-lg p-2 border text-center shadow-lg"
              style={{ borderColor: `${currentSeason.borderColor}50` }}
            >
              <span className="text-[7.5px] xl:text-[8px] text-zinc-300 block font-mono">
                {currentSeason.footerTop}
              </span>
              <span 
                className="text-[10px] xl:text-[11px] font-black font-mono tracking-wider"
                style={{ color: currentSeason.borderColor }}
              >
                {currentSeason.footerBottom}
              </span>
            </div>

            {/* 5 Season Dots Indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {SEASON_CARDS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === seasonIndex ? 'w-4 bg-white shadow-sm' : 'w-1 bg-white/30'
                  }`}
                  style={{ backgroundColor: idx === seasonIndex ? currentSeason.borderColor : undefined }}
                />
              ))}
            </div>
          </div>

          {/* Shine Sweep Overlay */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        </Link>
      )}
    </aside>
  );
}

// 5 Season Icons
function CrownIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
      <path d="M4 26L8 12L14 20L18 8L22 20L28 12L32 26H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="4" cy="26" r="2.5" fill="currentColor" />
      <circle cx="18" cy="8" r="2.5" fill="#E8B429" />
      <circle cx="32" cy="26" r="2.5" fill="currentColor" />
      <line x1="4" y1="29" x2="32" y2="29" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SakuraIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" transform="rotate(72 18 18)" />
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" transform="rotate(144 18 18)" />
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" transform="rotate(216 18 18)" />
      <ellipse cx="18" cy="10" rx="4" ry="7" fill="rgba(99,166,111,0.25)" stroke="currentColor" strokeWidth="1.2" transform="rotate(288 18 18)" />
      <circle cx="18" cy="18" r="3.5" fill="currentColor" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 52 52" fill="none" className="w-full h-full">
      <circle cx="26" cy="26" r="10" fill="rgba(245,197,66,0.2)" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="26" cy="26" r="6" fill="currentColor" opacity="0.6" />
      <line x1="26" y1="4" x2="26" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="42" x2="26" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="26" x2="10" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="42" y1="26" x2="48" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.8" y1="10.8" x2="15.1" y2="15.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36.9" y1="36.9" x2="41.2" y2="41.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="41.2" y1="10.8" x2="36.9" y2="15.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15.1" y1="36.9" x2="10.8" y2="41.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
      <path d="M18 4C10 4 4 12 4 20c0 7 6 12 14 12 8 0 14-5 14-12 0-8-6-16-14-16z" fill="rgba(232,117,41,0.2)" stroke="currentColor" strokeWidth="1.5" />
      <line x1="18" y1="32" x2="18" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
      <line x1="18" y1="4" x2="18" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="4" y1="18" x2="32" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="18" cy="4" r="1.5" fill="currentColor" />
      <circle cx="18" cy="32" r="1.5" fill="currentColor" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
      <circle cx="32" cy="18" r="1.5" fill="currentColor" />
      <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
