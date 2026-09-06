// types/team.ts

export type ValorantRole = 'DUELIST' | 'INITIATOR' | 'CONTROLLER' | 'SENTINEL' | 'FLEX';
export type RosterStatus = 'OPEN' | 'LOCKED';

// บทบาทในทีมจริงตาม team_role_type (DB) — ไม่มีตำแหน่งในเกม (DUELIST/INITIATOR/...)
// เก็บอยู่ในระบบตอนนี้ ต่างจาก ValorantRole ที่ยังใช้เฉพาะฝั่ง Registration Flow (mock)
export type TeamRoleType = 'OWNER' | 'CAPTAIN' | 'PLAYER' | 'SUBSTITUTE' | 'COACH' | 'MANAGER';

export interface PlayerSlot {
  id: string;
  userId: string;
  handle: string;           // e.g. "VIPER_99"
  fullNameTh: string;       // e.g. "วิชาญ พรหมรักษ์"
  initials: string;         // e.g. "VP"
  role: TeamRoleType;       // "CAPTAIN" | "PLAYER" | "SUBSTITUTE" | ...
  isCaptain: boolean;       // true = แสดงมงกุฎ
  isSubstitute: boolean;    // role === 'SUBSTITUTE'
  jerseyNumber: number | null;
  isVerified: boolean;      // มี game_account ของเกมนี้ที่ verification_status = VERIFIED
}

export interface TeamProfileData {
  id: string;
  name: string;             // "ZODIAC APEX"
  tag: string;              // "[ZA]"
  orgName: string | null;   // "ZODIAC ESPORTS ORG" — null ถ้าทีมไม่สังกัด org
  logoInitials: string;     // "ZA"
  currentRank: number | null; // อันดับใน season ที่ active อยู่ (null ถ้าไม่มี season active หรือไม่มีอันดับ)
  seasonName: string;       // "SUMMER · SEASON 2" หรือ "ยังไม่มี Season Active"
  stats: {
    wins: number;
    losses: number;
    winRate: number;        // (%)
    tournamentsEntered: number;
    zpEarned: string;       // formatted เช่น "142K"
  };
  rosterStatus: RosterStatus; // "OPEN" | "LOCKED"
  lockDeadlineText?: string;  // จาก teams.locked_until ถ้ามี
  startingRoster: PlayerSlot[]; // role !== 'SUBSTITUTE'
  substitutes: PlayerSlot[];    // role === 'SUBSTITUTE'
}
