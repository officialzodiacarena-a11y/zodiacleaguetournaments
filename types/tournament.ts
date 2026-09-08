// types/tournament.ts

export type SeasonSplit = 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';
export type TournamentCardStatus = 'OPEN' | 'UPCOMING' | 'ONGOING' | 'CONCLUDED' | 'NOT_YET_OPEN';

export interface TournamentItem {
  id: string;                    // tournaments.id
  seasonId?: string;             // tournaments.season_id
  circuitSeasonText: string;     // e.g. "SUMMER CIRCUIT · 2026"
  name: string;                  // e.g. "SUMMER OPEN I"
  status: TournamentCardStatus;  // "OPEN" | "UPCOMING" | "ONGOING" | "CONCLUDED" | "NOT_YET_OPEN"
  format: string;                // e.g. "5v5 Single Elimination"
  prizePoolZp: number;           // จาก tournaments.prize_zp
  entryFeeAp: number;            // จาก tournaments.entry_fee_ap (e.g. 50 AP)
  prizeTopText: string;          // e.g. "TOP 8"
  dateRangeText: string;         // e.g. "14–16 มิ.ย." หรือ "TBA"
  yearText: string;              // e.g. "2026"
  registeredTeams: number;       // นับจำนวนจาก tournament_registrations
  maxTeams: number;              // จาก tournaments.max_teams (e.g. 16)
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  accentTheme: 'gold' | 'purple' | 'gray';
}

export interface UserZpSummary {
  seasonName: string;            // "Summer Circuit 2026"
  accumulatedZp: number;         // แต้มรวม ZP ปัจจุบัน
  rankNumber: number;            // อันดับใน Leaderboard ปัจจุบัน
  nextRankZp: number;            // แต้มที่ต้องการเพื่อแซงอันดับถัดไป
  nextRankTarget: number;        // อันดับเป้าหมายถัดไป
  progressPercentage: number;    // % ความคืบหน้า (0-100)
}

export interface TournamentRegistryPageData {
  seasonId?: string;
  activeSeason: SeasonSplit;
  circuitActiveText: string;     // "CIRCUIT ACTIVE" | "ยังไม่มี Season Active"
  registrationDeadlineText: string; // "30 มิ.ย." หรือ "TBA"
  tournaments: TournamentItem[];
  userZpSummary?: UserZpSummary;  // undefined ถ้ายังไม่ login หรือทีมยังไม่มีอันดับใน season นี้
}
