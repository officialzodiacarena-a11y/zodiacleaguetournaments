// types/team.ts
import { Database } from './supabase';

export type ValorantRole = 'DUELIST' | 'INITIATOR' | 'CONTROLLER' | 'SENTINEL' | 'FLEX';
export type RosterStatus = 'OPEN' | 'LOCKED';

export type TeamRoleType = Database['public']['Enums']['team_role_type'];

export interface PlayerSlot {
  id: string;               // player_id
  userId: string;
  riotId: string;           // e.g. "SkyNova#TH1"
  handle: string;           // e.g. "VIPER_99"
  fullNameTh: string;       // e.g. "วิชาญ พรหมรักษ์"
  initials: string;         // e.g. "VP"
  role: TeamRoleType;       // "OWNER" | "CAPTAIN" | "PLAYER" | "SUBSTITUTE" | "COACH" | "MANAGER"
  valorantRole?: ValorantRole; // ตำแหน่งในเกม VALORANT (Duelist/Initiator/...)
  isCaptain: boolean;       // true = แสดงมงกุฎ
  isSubstitute: boolean;    // role === 'SUBSTITUTE'
  jerseyNumber: number | null;
  isVerified: boolean;      // มี game_account ที่ verification_status = VERIFIED
}

export interface TeamProfileData {
  id: string;
  name: string;             // "ZODIAC APEX"
  tag: string;              // "ZA"
  orgName: string | null;   // "ZODIAC ESPORTS ORG" — null ถ้าทีมไม่สังกัด org
  logoUrl?: string | null;
  logoInitials: string;     // "ZA"
  currentRank: number | null; // อันดับใน season ที่ active อยู่
  seasonName: string;       // "SUMMER · SEASON 2"
  stats: {
    wins: number;
    losses: number;
    winRate: number;        // (%)
    tournamentsEntered: number;
    zpEarned: string;       // formatted เช่น "142K"
  };
  rosterStatus: RosterStatus; // "OPEN" | "LOCKED"
  lockDeadlineText?: string;  // จาก teams.locked_until
  startingRoster: PlayerSlot[]; // role !== 'SUBSTITUTE'
  substitutes: PlayerSlot[];    // role === 'SUBSTITUTE'
}
