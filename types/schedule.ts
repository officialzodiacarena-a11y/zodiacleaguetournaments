// types/schedule.ts

export type MatchStatus = 'LIVE' | 'COMPLETED' | 'UPCOMING';

export interface ScheduleMatch {
  id: string;
  timeText: string;             // "14:00", "16:00", "18:00" หรือ "TBA"
  stageRoundLabel: string;      // จาก tournament_stages.name
  teamAName: string;            // "STELLAR FORCE" หรือ "TBD"
  teamBName: string;            // "COSMIC RAGE" หรือ "TBD"
  teamAScore?: number;          // 8
  teamBScore?: number;          // 5
  scoreText?: string;           // "13 – 7" — คำนวณเฉพาะตอน COMPLETED
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
  seasonTitle: string;          // "SUMMER CIRCUIT 2025" หรือ "ยังไม่มี Season Active"
  liveBannerMatch?: ScheduleMatch; // undefined ถ้าไม่มีแมตช์ LIVE อยู่ตอนนี้
  todayMatches: ScheduleMatch[];
  standings: StandingTeamItem[];
  lastUpdatedText: string;      // "15:42 น."
}
