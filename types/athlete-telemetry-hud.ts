// types/athlete-telemetry-hud.ts

export interface AccuracyAnatomyData {
  headPct: number;
  headHits: number;
  bodyPct: number;
  bodyHits: number;
  legPct: number;
  legHits: number;
}

export interface RoleMasteryItem {
  roleName: string;
  roleKey: string;
  winRatePct: number;
  wins: number;
  losses: number;
  kdaRatio: number;
  kills: number;
  deaths: number;
  assists: number;
}

export interface WeaponPerformanceItem {
  weaponName: string;
  category: string;
  kills: number;
  headPct: number;
  bodyPct: number;
  legPct: number;
}

export interface SparklineTileItem {
  matchId: string;
  timeAgo: string;
  isWin: boolean;
  scoreSummary: string;
  kdRatio: number;
}

export interface DetailedMatchRowItem {
  matchId: string;
  playedAt: string;
  dateLabel: string;
  mapName: string;
  agentPlayed: string | null;
  agentCode: string;
  roundLabel: string;
  isWin: boolean;
  scoreSummary: string;
  teamScore: number;
  opponentScore: number;
  kills: number;
  deaths: number;
  assists: number;
  kdRatio: number;
  acs: number | null;
  adr: number | null;
  headshotPct: number | null;
}

export interface TelemetryHudCompositePayload {
  overview: {
    playerId: string;
    athleteId: string;
    displayName: string;
    avatarUrl: string | null;
    gameName: string | null;
    tagLine: string | null;
    isVerified: boolean;
    zodiacSign: string | null;
    isSelf: boolean;
    apBalance: number | null;
    zpBalance: number | null;
    zpBalanceAvailable: boolean;
    currentRankTier: string | null;
    currentRankRr: number | null;
    peakRr: number | null;
    peakSeason: string | null;
    metrics: {
      acs: number | null;
      kdRatio: number | null;
      kdaRatio: number | null;
      adr: number | null;
      headshotPct: number | null;
      winRatePct: number | null;
      wins: number | null;
      losses: number | null;
    };
    rolling20Record: string;
    rolling20WinRatePct: number | null;
  };
  accuracyAnatomy: AccuracyAnatomyData | null;
  rolesBreakdown: RoleMasteryItem[];
  topWeapons: WeaponPerformanceItem[];
  rolling20Tiles: SparklineTileItem[];
  recent20Matches: DetailedMatchRowItem[];
  lastUpdatedIso: string;
}
