// types/bracket.ts
import { Database } from './supabase';

export type BracketNodeStatus = Database['public']['Enums']['bracket_node_status_type'];
export type MatchStatus = Database['public']['Enums']['match_status_type'];

export type BracketRoundTab =
  | 'ro32'
  | 'ro16'
  | 'ro8'
  | 'semi'
  | 'final'
  | 'lower_semi'
  | 'lower_final'
  | 'grand_final';

export interface BracketTeamParticipant {
  id?: string;
  name: string;
  tag: string;
  logoUrl?: string | null;
  seedText?: string; // e.g. "#1 SEED" หรือ "Group A Winner"
  score?: number | string; // e.g. 2 หรือ "—"
  isWinner?: boolean;
}

export interface MapResultDetail {
  gameNumber: number;
  mapName: string; // e.g. "Ascent", "Bind", "Haven"
  mapNumberLabel: string; // e.g. "Map 1"
  scoreA: number;
  scoreB: number;
  winnerTeamId?: string;
  isWinA: boolean;
  durationSeconds?: number;
}

export interface MvpPlayerDetail {
  playerId?: string;
  riotId: string; // e.g. "SUPERSTAR#TH1"
  initials: string;
  agentPlayed: string; // e.g. "Jett", "Omen"
  rolePlayed?: string; // e.g. "Duelist"
  acs: number;
  kd: number;
  adr?: number;
  headshotPct?: number;
}

export interface BracketMatchNode {
  id: string; // bracket_node_id
  matchId?: string;
  matchNumber: number;
  roundNumber: number;
  positionInRound: number;
  bracketType?: 'UPPER' | 'LOWER' | 'FINAL' | 'SWISS';
  label?: string | null; // e.g. "Upper Bracket Quarterfinals"
  bestOf: number;
  status: BracketNodeStatus;
  teamA: BracketTeamParticipant;
  teamB: BracketTeamParticipant;
  mapResults?: MapResultDetail[];
  seriesScoreText?: string; // e.g. "2 : 1"
  mvp?: MvpPlayerDetail;
  winnerToNodeId?: string | null;
  loserToNodeId?: string | null;
}

export interface TournamentBracketRound {
  roundNumber: number;
  roundName: string; // e.g. "Quarterfinals", "Semifinals", "Grand Finals"
  roundKey: BracketRoundTab;
  matches: BracketMatchNode[];
}

export interface TournamentBracketPageData {
  tournamentId: string;
  tournamentName: string; // e.g. "ZODIAC VALORANT CHALLENGER #1"
  subMetaText: string; // e.g. "14–16 มิ.ย. 2026 · 5v5 SINGLE ELIMINATION · 8 TEAMS"
  prizeZpText: string; // e.g. "50,000 ZP"
  entryFeeApText?: string; // e.g. "500 AP"
  stages: {
    id: string;
    name: string;
    format: string;
    status: string;
    rounds: TournamentBracketRound[];
  }[];
}
