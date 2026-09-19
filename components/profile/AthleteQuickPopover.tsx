'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlayerVerticalProfile, PlayerVerticalProfileProps } from './PlayerVerticalProfile';
import Link from 'next/link';

export interface AthleteQuickPopoverProps {
  playerId: string;
  fallbackData: {
    riotId: string;
    avatarUrl?: string | null;
    role: string;
    tierTitle: string;
    winRate: number;
    avgAcs: number;
    avgKd: number;
    avgAdr: number;
    headshotPct: number;
    rolling20Record?: string;
  };
  children: React.ReactNode;
}

export interface TelemetryData {
  gameName?: string;
  tagLine?: string;
  avatarUrl?: string;
  primaryRole?: string;
  tierTitle?: string;
  zodiacPoints?: number;
  apBalance?: number;
  winRate?: number;
  avgAcs?: number;
  avgKd?: number;
  avgAdr?: number;
  headshotPct?: number;
  rolling20Record?: string;
  _isGuest?: boolean;
}

const CACHE = new Map<string, { data: TelemetryData, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const AthleteQuickPopover: React.FC<AthleteQuickPopoverProps> = ({
  playerId,
  fallbackData,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [data, setData] = useState<TelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (CACHE.has(playerId)) {
      const cached = CACHE.get(playerId)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setIsGuest(cached.data._isGuest || false);
        return;
      }
    }
    
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/v1/players/me/telemetry-hud?playerId=${playerId}`);
      if (res.status === 401) {
        setIsGuest(true);
        CACHE.set(playerId, { data: { _isGuest: true }, timestamp: Date.now() });
      } else if (res.ok) {
        const json = await res.json();
        setData(json.data || {});
        setIsGuest(false);
        CACHE.set(playerId, { data: json.data || {}, timestamp: Date.now() });
      } else {
        setIsGuest(true); // Fallback on other errors
      }
    } catch (e) {
      console.error(e);
      setIsGuest(true);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [playerId]);

  useEffect(() => {
    if (isHovered) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(true);
        if (!data && !isGuest && !isLoading) {
          fetchData();
        }
      }, 250);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // add small delay before closing to allow mouse move into popover
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isHovered, data, isGuest, isLoading, fetchData]);

  // Click outside to close (Mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsHovered(false);
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOpen = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsHovered(!isOpen);
    if (!isOpen && !data && !isGuest && !isLoading) {
      fetchData();
    }
  };

  const popoverProps: PlayerVerticalProfileProps = {
    playerId,
    riotId: data?.gameName && data?.tagLine ? `${data.gameName}#${data.tagLine}` : fallbackData.riotId,
    avatarUrl: data?.avatarUrl || fallbackData.avatarUrl,
    role: data?.primaryRole || fallbackData.role,
    tierTitle: data?.tierTitle || fallbackData.tierTitle,
    zodiacPoints: data?.zodiacPoints,
    apBalance: isGuest ? undefined : data?.apBalance,
    winRate: data?.winRate !== undefined ? data.winRate : fallbackData.winRate,
    avgAcs: data?.avgAcs !== undefined ? data.avgAcs : fallbackData.avgAcs,
    avgKd: data?.avgKd !== undefined ? data.avgKd : fallbackData.avgKd,
    avgAdr: data?.avgAdr !== undefined ? data.avgAdr : fallbackData.avgAdr,
    headshotPct: data?.headshotPct !== undefined ? data.headshotPct : fallbackData.headshotPct,
    rolling20Record: data?.rolling20Record || fallbackData.rolling20Record,
    isLoading: isLoading && !data && !isGuest,
  };

  return (
    <div 
      className="relative inline-block" 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        onClick={toggleOpen} 
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen(e as unknown as React.MouseEvent);
          }
        }}
        role="button"
        tabIndex={0}
        className="inline-block cursor-pointer"
      >
        {children}
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-[350px] max-w-[calc(100vw-32px)] md:w-[380px] -translate-x-1/2 left-1/2 sm:translate-x-0 sm:left-auto sm:right-0">
          <div className="bg-[#0D0E1A] rounded-2xl shadow-2xl border border-white/10 relative">
            <PlayerVerticalProfile {...popoverProps} />
            
            {isGuest && (
              <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                <div className="text-[#E8B429] mb-3">
                  <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-2">เข้าสู่ระบบเพื่อดูข้อมูล</h3>
                <p className="text-xs text-neutral-300 mb-4">
                  ดูสถิติเชิงลึก Action Points และประวัติการแข่งขันของ {fallbackData.riotId}
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <Link href={`/profile/${playerId}`} className="w-full py-2 bg-[#E8B429]/10 border border-[#E8B429]/30 text-[#E8B429] rounded-lg text-xs font-bold hover:bg-[#E8B429]/20 transition-colors">
                    ส่องสถิติคร่าวๆ (View Passport)
                  </Link>
                  <Link href="/login" className="w-full py-2 bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF] rounded-lg text-xs font-bold hover:bg-[#00D4FF]/20 transition-colors">
                    เข้าสู่ระบบ / Register
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
