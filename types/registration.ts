// types/registration.ts

import { ValorantRole } from './team';

export type PlayerEligibilityStatus = 'ELIGIBLE' | 'UNVERIFIED' | 'INELIGIBLE';

export interface RegistrationRosterMember {
  id: string;
  userId: string;
  handle: string;           // "SkyNova"
  fullNameTh: string;       // "ณัฐพล เสรีวัฒนา"
  initials: string;         // "SN"
  role: ValorantRole;       // "DUELIST"
  isCaptain: boolean;
  isSubstitute: boolean;
  eligibilityStatus: PlayerEligibilityStatus;
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
  entryFeeAp: number;             // 50
  entryFeeThbText: string;        // "25 THB"
  currentApBalance: number;       // 124
  roster: RegistrationRosterMember[];
  checkList: EligibilityCheckItem[];
  unverifiedPlayerNotice?: string;// "Phr1sm ยังไม่ได้ยืนยันตัวตน · จะถูกตรวจสอบก่อน deadline"
}
