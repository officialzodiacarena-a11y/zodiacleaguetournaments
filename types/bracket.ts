// types/bracket.ts

export type BracketRoundTab = 'ro8' | 'semi' | 'final';
export type BracketMatchStatus = 'COMPLETED' | 'LIVE' | 'UPCOMING';

export interface BracketTeamParticipant {
  name: string;             // "ZODIAC APEX"
  tag: string;              // "ZA"
  seedText: string;         // "#1 SEED"
  score?: number | string;  // 2 หรือ "—"
  isWinner?: boolean;
}

export interface MapResultDetail {
  mapName: string;          // "Ascent"
  mapNumberLabel: string;   // "Map 1"
  scoreA: number;           // 13
  scoreB: number;           // 7
  isWinA: boolean;
}

export interface MvpPlayerDetail {
  handle: string;           // "VIPER_99"
  initials: string;         // "V9"
  acs: number;              // 312
  kd: number;               // 2.4
}

export interface BracketMatchNode {
  matchNumber: number;      // 1, 2, 3, 4
  status: BracketMatchStatus;
  teamA: BracketTeamParticipant;
  teamB: BracketTeamParticipant;
  mapResults?: MapResultDetail[];
  seriesScoreText?: string; // "2 : 0"
  mvp?: MvpPlayerDetail;
}

export interface TournamentBracketPageData {
  tournamentName: string;   // "SUMMER OPEN I"
  subMetaText: string;      // "14–16 มิ.ย. 2026 · 5v5 SINGLE ELIMINATION · 8 TEAMS"
  prizePoolText: string;    // "฿50,000"
  qfMatches: BracketMatchNode[];
}
