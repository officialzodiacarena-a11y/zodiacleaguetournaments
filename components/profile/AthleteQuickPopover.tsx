'use client';

import React from 'react';
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

export const AthleteQuickPopover: React.FC<AthleteQuickPopoverProps> = ({
  playerId,
  children,
}) => {
  return (
    <Link 
      href={`/profile/${playerId}`} 
      className="inline-block hover:opacity-80 transition-opacity"
      title="View Full Profile"
    >
      {children}
    </Link>
  );
};
