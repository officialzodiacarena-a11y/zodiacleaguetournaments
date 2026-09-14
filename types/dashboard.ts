// types/dashboard.ts

export type ZodiacSign = 
  | 'ARIES' | 'TAURUS' | 'GEMINI' | 'CANCER' 
  | 'LEO' | 'VIRGO' | 'LIBRA' | 'SCORPIO' 
  | 'SAGITTARIUS' | 'CAPRICORN' | 'AQUARIUS' | 'PISCES';

export type DivisionTier = 'RISING_STAR' | 'CONSTELLATION' | 'CELESTIAL';

export interface AthleteProfile {
  id: string;
  displayName: string;
  riotId: string;
  isVerified: boolean;
  divisionTier: DivisionTier;
  zodiacSign: ZodiacSign;
  role: string;
  teamName: string;
  zpBalance: number;
  apBalance: number;
}

export interface CoreKpiMetrics {
  acs: number;
  kdRatio: number;
  winRatePct: number;
  kastPct: number;
  headshotPct: number;
  adr: number;
  recentRecord: string; // e.g. "14W - 6L"
}

export interface RadarPerformanceData {
  aim: number;        // e.g. 85
  acs: number;        // e.g. 92
  firstKills: number; // e.g. 84
  clutchPct: number;  // e.g. 78
  utility: number;    // e.g. 88
}

export interface MapMastery {
  mapName: string;
  winRatePct: number;
  record: string; // e.g. "4W - 0L"
  isWeakest?: boolean;
}

export interface WeaponPerformance {
  weaponName: string;
  category: string;
  kills: number;
  headPct: number;
  bodyPct: number;
  legPct: number;
}

export interface AgentMastery {
  agentName: string;
  playTimeHours: number;
  matches: number;
  winRatePct: number;
  kd: number;
  acs: number;
}
export interface WeaponPerformance {
  weaponName: string;
  category: string;
  kills: number;
  headPct: number;
  bodyPct: number;
  legPct: number;
}

export interface MapMastery {
  mapName: string;
  winRatePct: number;
  record: string;
  isWeakest?: boolean;
}