// types/team.ts

export type ValorantRole = 'DUELIST' | 'INITIATOR' | 'CONTROLLER' | 'SENTINEL' | 'FLEX';
export type RosterStatus = 'OPEN' | 'LOCKED';

export interface PlayerSlot {
  id: string;
  userId: string;
  handle: string;           // e.g. "VIPER_99"
  fullNameTh: string;       // e.g. "วิชาญ พรหมรักษ์"
  initials: string;         // e.g. "VP"
  role: ValorantRole;       // "DUELIST" | "INITIATOR" | ...
  isCaptain: boolean;       // true = แสดงมงกุฎ
  isSubstitute: boolean;    // false = 5 ตัวจริง, true = ตัวสำรอง (Bench)
  agentIcon: string;        // Emoji หรือ Icon URL เช่น "🐍", "⚡"
  kdRatio: number;          // e.g. 2.41
  avgDmg: number;           // e.g. 284
}

export interface TeamProfileData {
  id: string;
  name: string;             // "ZODIAC APEX"
  tag: string;              // "[ZA]"
  orgName: string;          // "ZODIAC ESPORTS ORG"
  logoInitials: string;     // "ZA"
  currentRank: number;      // 12
  seasonName: string;       // "SEASON 7 · ACT II"
  stats: {
    wins: number;           // 64
    losses: number;         // 41
    winRate: number;        // 61 (%)
    tournamentsEntered: number; // 18
    zpEarned: string;       // "142K"
  };
  rosterStatus: RosterStatus; // "OPEN" | "LOCKED"
  lockDeadlineText?: string;  // "3 days remaining"
  startingRoster: PlayerSlot[]; // ตัวจริง 5 คน
  substitutes: PlayerSlot[];    // ตัวสำรอง 2 คน
}
