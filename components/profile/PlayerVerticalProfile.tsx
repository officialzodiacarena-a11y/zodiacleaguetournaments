'use client';

import React from 'react';
import Image from 'next/image';

export interface PlayerVerticalProfileProps {
  playerId?: string;
  riotId?: string;
  avatarUrl?: string;
  role?: 'Duelist' | 'Initiator' | 'Sentinel' | 'Controller';
  tierTitle?: string;
  zodiacPoints?: number;
  apBalance?: number;
  winRate?: number;
  isLoading?: boolean;
}

export const PlayerVerticalProfile: React.FC<PlayerVerticalProfileProps> = ({
  playerId = 'usr_unknown',
  riotId = 'Operator#TH1',
  avatarUrl,
  role = 'Duelist',
  tierTitle = 'Ascendant III',
  zodiacPoints = 0,
  apBalance = 0,
  winRate = 0,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[400px] bg-[#1A1C2E]/60 border border-[#E8B429]/20 rounded-2xl p-6 flex flex-col items-center justify-between animate-pulse relative backdrop-blur-md">
        <div className="w-full flex justify-between items-center">
          <div className="h-4 w-16 bg-white/10 rounded" />
          <div className="h-4 w-12 bg-white/10 rounded-full" />
        </div>
        <div className="h-24 w-24 rounded-2xl bg-white/10 mt-4" />
        <div className="w-full space-y-2 mt-4 text-center">
          <div className="h-5 w-32 bg-white/10 mx-auto rounded" />
          <div className="h-3 w-20 bg-white/10 mx-auto rounded" />
        </div>
        <div className="w-full space-y-2 mt-6">
          <div className="h-10 w-full bg-white/10 rounded-xl" />
          <div className="h-10 w-full bg-white/10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#1A1C2E] border border-white/10 hover:border-[#E8B429]/50 rounded-2xl p-5 md:p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md transition-all duration-300 group overflow-hidden">
      {/* 1. Header: Player Tag & Role */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-widest text-[#75798c] uppercase">
            ID: {playerId.slice(0, 8)}
          </span>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md tracking-wider border font-mono uppercase bg-[#E8B429]/10 text-[#E8B429] border-[#E8B429]/30">
            {role}
          </span>
        </div>

        {/* 2. Avatar */}
        <div className="relative flex justify-center mt-6 mb-4">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#0D0E1A] border-2 border-[#E8B429]/30 group-hover:border-[#E8B429] transition-colors flex items-center justify-center">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={riotId}
                fill
                className="object-cover"
              />
            ) : (
              <span className="font-mono text-2xl font-black text-[#E8B429]">
                {riotId.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* 3. Riot ID & Rank */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-white tracking-wide truncate group-hover:text-[#E8B429] transition-colors font-mono">
            {riotId}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0D0E1A] border border-white/10 text-[11px] font-semibold text-[#b2b6ca]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
            <span>{tierTitle}</span>
          </div>
        </div>
      </div>

      {/* 4. Zodiac Stats (ZP, AP, WR%) */}
      <div className="mt-6 space-y-2.5 pt-4 border-t border-white/10">
        {/* Zodiac Points */}
        <div className="bg-[#0D0E1A]/80 border border-white/5 rounded-xl p-3 flex justify-between items-center">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#75798c] font-bold">
              Zodiac Points
            </div>
            <div className="text-base font-black text-[#E8B429] font-mono">
              {zodiacPoints.toLocaleString()} <span className="text-[11px] font-normal text-[#75798c]">ZP</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#75798c] font-bold">
              Win Rate
            </div>
            <div className="text-sm font-bold text-[#34d399] font-mono">
              {winRate}%
            </div>
          </div>
        </div>

        {/* AP Balance */}
        <div className="bg-[#0D0E1A]/80 border border-white/5 rounded-xl p-2.5 flex justify-between items-center">
          <div className="text-[9px] uppercase font-mono tracking-wider text-[#75798c] font-bold">
            Action Points (AP)
          </div>
          <div className="text-xs font-black text-[#9184d9] font-mono">
            {apBalance.toLocaleString()} AP
          </div>
        </div>
      </div>
    </div>
  );
};
