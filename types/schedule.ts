// types/schedule.ts
import { Database } from './supabase';

export type DbMatchStatus = Database['public']['Enums']['match_status_type'];
export type ScheduleMatchDisplayStatus = 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'DISPUTED';

export interface ScheduleTeamInfo {
  id?: string;
  name: string;            // "STELLAR FORCE" หรือ "TBD"
  tag?: string;            // "SF"
  logoUrl?: string | null;
  score?: number;          // สกอร์เกม เช่น 13 หรือจำนวนแผนที่ชนะ เช่น 2
  isWinner?: boolean;
}

export interface ScheduleMatch {
  id: string;              // match_id
  tournamentId?: string;
  tournamentName?: string; // "ZODIAC OPEN I"
  stageRoundLabel: string; // "Semifinals" หรือ "Group Stage - Round 1"
  bestOf: number;          // 1, 3, 5
  bestOfText?: string;     // "BO3"
  timeText: string;        // "14:00", "18:30" หรือ "TBA"
  scheduledAt?: string | null;
  status: ScheduleMatchDisplayStatus;
  rawStatus?: DbMatchStatus;
  teamA: ScheduleTeamInfo;
  teamB: ScheduleTeamInfo;
  seriesScoreText?: string;// "2 : 1" หรือ "—"
  streamUrl?: string | null;
  hasWatchEarn?: boolean;  // มีแจกแต้ม AP จากการดูถ่ายทอดสดหรือไม่
}

export interface StandingTeamItem {
  rank: number;
  teamId: string;
  teamName: string;
  teamTag: string;
  logoUrl?: string | null;
  wins: number;
  losses: number;
  winRate: number;         // 61.5 (%)
  zpTotal: number;         // อิงตามคอลัมน์ total_zp ใน season_standings
  isHighlight?: boolean;   // ไฮไลต์ทีม Top 1 หรือทีมของผู้ใช้
}

export interface MatchSchedulePageData {
  seasonId?: string;
  seasonTitle: string;     // "ZODIAC VALORANT CIRCUIT 2026"
  circuitName?: string;
  liveBannerMatch?: ScheduleMatch; // undefined ถ้าไม่มีแมตช์ LIVE อยู่
  todayMatches: ScheduleMatch[];
  upcomingMatches?: ScheduleMatch[];
  recentMatches?: ScheduleMatch[];
  standings: StandingTeamItem[];
  lastUpdatedText: string; // "15:42 น."
}
