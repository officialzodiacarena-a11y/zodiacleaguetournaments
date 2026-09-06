// types/tournament.ts

export type SeasonSplit = 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';
export type TournamentCardStatus = 'OPEN' | 'UPCOMING' | 'CONCLUDED' | 'NOT_YET_OPEN';
export type TournamentFormat = '5v5 SINGLE ELIM' | '5v5 DOUBLE ELIM' | 'INVITE ONLY';

export interface TournamentItem {
  id: string;
  circuitSeasonText: string;     // e.g. "SUMMER CIRCUIT · 2026"
  name: string;                  // e.g. "SUMMER OPEN I"
  status: TournamentCardStatus;  // "OPEN" | "UPCOMING" | "CONCLUDED" | "NOT_YET_OPEN"
  format: TournamentFormat;
  prizePoolZp: number;           // e.g. 1000
  prizeTopText: string;          // e.g. "TOP 8" หรือ "TOP 4"
  dateRangeText: string;         // e.g. "14–16 มิ.ย."
  yearText: string;              // e.g. "2026"
  registeredTeams: number;       // e.g. 12
  maxTeams: number;              // e.g. 16
  accentTheme: 'gold' | 'purple' | 'gray';
}

export interface UserZpSummary {
  seasonName: string;            // "Summer Circuit"
  accumulatedZp: number;         // 750
  rankNumber: number;            // 23
  nextRankZp: number;            // 250
  nextRankTarget: number;        // 22
  progressPercentage: number;    // 75
}

export interface TournamentRegistryPageData {
  activeSeason: SeasonSplit;
  circuitActiveText: string;     // "CIRCUIT ACTIVE"
  registrationDeadlineText: string; // "30 มิ.ย."
  tournaments: TournamentItem[];
  userZpSummary: UserZpSummary;
}
