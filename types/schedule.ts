// types/schedule.ts

export type MatchStatus = 'LIVE' | 'COMPLETED' | 'UPCOMING';

export interface ScheduleMatch {
  id: string;
  timeText: string;             // "14:00", "16:00", "18:00"
  stageRoundLabel: string;      // "QF", "Round of 8"
  teamAName: string;            // "STELLAR FORCE"
  teamBName: string;            // "COSMIC RAGE"
  teamAScore?: number;          // 8
  teamBScore?: number;          // 5
  scoreText?: string;           // "13 – 7" หรือ "8 – 5"
  mapInfo?: string;             // "Map 2/3 · Haven"
  teamASeedText?: string;       // "#2 SEED"
  teamBSeedText?: string;       // "#5 SEED"
  status: MatchStatus;
}

export interface StandingTeamItem {
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  winRate: number;              // 61 (%)
  zpTotal: number;              // 2450
  isHighlight?: boolean;        // Rank 1 ไฮไลต์สีทอง
}

export interface MatchSchedulePageData {
  seasonTitle: string;          // "SUMMER CIRCUIT 2025"
  liveBannerMatch: ScheduleMatch;
  todayMatches: ScheduleMatch[];
  standings: StandingTeamItem[];
  lastUpdatedText: string;      // "15:42 น."
}
