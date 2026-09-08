// types/registration.ts

import { ValorantRole } from './team';

export type PlayerEligibilityStatus = 'ELIGIBLE' | 'UNVERIFIED' | 'INELIGIBLE';

export interface RegistrationRosterMember {
  id: string;              // player_id
  userId: string;
  riotId: string;          // e.g. "SkyNova#TH1"
  handle: string;          // "SkyNova"
  fullNameTh?: string;     // "ณัฐพล เสรีวัฒนา"
  initials: string;        // "SN"
  role: ValorantRole;      // "Duelist" | "Initiator" | "Sentinel" | "Controller"
  gameAccountId?: string;
  isCaptain: boolean;
  isSubstitute: boolean;
  eligibilityStatus: PlayerEligibilityStatus;
  eligibilityNotes?: string;
}

export interface EligibilityCheckItem {
  id: string;
  label: string;
  isPassed: boolean;
  warningNote?: string;
}

export interface TournamentRegistrationFlowData {
  tournamentId: string;
  tournamentName: string;         // "Summer Open I"
  dateRangeText: string;          // "14–16 มิ.ย. 2026"
  formatText: string;             // "5v5 SINGLE ELIM"
  prizeZpText: string;            // "ZP 1,000"
  statusBadgeText: string;        // "OPEN"
  teamId: string;
  teamName: string;               // "CELESTIAL WOLVES"
  teamTag: string;                // "CW"
  entryFeeAp: number;             // 50
  entryFeeThbText?: string;       // "25 THB"
  currentApBalance: number;       // 124
  roster: RegistrationRosterMember[];
  checkList: EligibilityCheckItem[];
  unverifiedPlayerNotice?: string;// "Phr1sm ยังไม่ได้ยืนยันตัวตน · จะถูกตรวจสอบก่อน deadline"
}

// ============================================================
// API Request & Response Types (tournament_registrations)
// ============================================================

export interface RegisterTournamentPayload {
  tournamentId: string;
  teamId: string;
  idempotencyKey: string;
  rosterMemberIds: {
    playerId: string;
    role: ValorantRole;
    isSubstitute: boolean;
  }[];
}

export interface RegisterTournamentResponse {
  success: boolean;
  registrationId: string;
  rosterSnapshotId: string;
  apDeducted: number;
  remainingApBalance: number;
  status: 'CONFIRMED' | 'PENDING' | 'WAITLIST';
  message?: string;
}
