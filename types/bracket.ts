// types/bracket.ts
import { Database } from './supabase';

export type BracketNodeStatus = Database['public']['Enums']['bracket_node_status_type'];
export type MatchStatus = Database['public']['Enums']['match_status_type'];

export interface BracketTeamParticipant {
  id?: string;
  name: string;
  tag: string;
  logoUrl?: string | null;
  seed?: number;
}

export interface BracketGameResult {
  gameNumber: number;
  mapName?: string;
  scoreA: number;
  scoreB: number;
  status: string;
}

export interface BracketMatchNode {
  id: string; // bracket_node_id
  matchId?: string; // matches.id (ใช้ลิงก์ไปหน้าผล)
  games?: BracketGameResult[]; // ผลรายแมพจาก match_games
  stageId: string;
  matchNumber: number;
  bracketType: 'UPPER' | 'LOWER' | 'GRAND_FINAL';
  roundNumber: number;
  positionInRound: number;
  label?: string; // e.g. "Grand Final" -- overrides the default "M{positionInRound}"
  bestOf: number;
  status: BracketNodeStatus;
  scoreA?: number;
  scoreB?: number;
  teamA?: BracketTeamParticipant;
  teamB?: BracketTeamParticipant;
  winnerTeamId?: string;
}

export interface MvpPlayerSummary {
  playerId?: string;
  displayName?: string;
  gameName?: string; // e.g. "Jett", "Omen"
  tagLine?: string;
  acs?: number;
  kd?: string;
}

export interface TournamentBracketPageData {
  tournamentId: string;
  tournamentName: string; // e.g. "ZODIAC VALORANT CHALLENGER #1"
  subMetaText: string; // e.g. "14–16 มิ.ย. 2026 · 5v5 DOUBLE ELIMINATION · 12 TEAMS"
  prizeZpText: string; // e.g. "10,000 ZP"
  prizeZp?: number; // รางวัลแชมป์ (ZP) จาก tournaments.prize_zp
  matches: BracketMatchNode[];
  mvpPlayer?: MvpPlayerSummary;
}
