// lib/tournament/bracket12Engine.ts

export interface BracketTeam {
  id: string;
  name: string;
  seed: number;
  logoUrl?: string | null;
}

export interface BracketMatch {
  id: string;
  stageId: string;
  round: number;
  positionInRound: number;
  matchNumber: number;
  bestOf: number;
  teamA: BracketTeam | null;
  teamB: BracketTeam | null;
  winner: BracketTeam | null;
  winnerToNodeId: string | null;
  winnerToSlot: string | null;
  loserToNodeId: string | null;
  loserToSlot: string | null;
  status: 'PENDING' | 'READY' | 'LIVE' | 'COMPLETED' | 'RESET' | 'VOID';
  bracketType: 'UPPER' | 'LOWER' | 'GRAND_FINAL';
}

export interface GeneratedBracket {
  stageId: string;
  rounds: BracketMatch[][];
  allNodes: BracketMatch[];
}

export function generateDoubleElimination12(
  stageId: string,
  teams: BracketTeam[] // 12 ทีม เรียง seed 1 ถึง 12
): GeneratedBracket {
  const teamMap = new Map<number, BracketTeam>();
  teams.forEach((t) => teamMap.set(t.seed, t));

  // --- UPPER BRACKET ---
  // UB R1 (4 Matches: Seed 5-12)
  // Pairings: [5, 12], [8, 9], [6, 11], [7, 10]
  const ubR1Pairings = [
    [5, 12], [8, 9], [6, 11], [7, 10]
  ];
  
  const ubR1: BracketMatch[] = ubR1Pairings.map((pair, idx) => ({
    id: `UB_R1_M${idx + 1}`,
    stageId,
    round: 1,
    positionInRound: idx + 1,
    matchNumber: idx + 1,
    bestOf: 3,
    teamA: teamMap.get(pair[0]) ?? null,
    teamB: teamMap.get(pair[1]) ?? null,
    winner: null,
    winnerToNodeId: `UB_R2_M${Math.floor(idx / 2) + 1}`,
    winnerToSlot: 'team_b', // ชนกับ Bye (Seed 1-4 ที่รออยู่ slot team_a)
    loserToNodeId: `LB_R1_M${Math.floor(idx / 2) + 1}`,
    loserToSlot: idx % 2 === 0 ? 'team_a' : 'team_b',
    status: 'PENDING',
    bracketType: 'UPPER',
  }));

  // UB R2 (4 Matches: Top 4 Seed BYE เจอผู้ชนะ UB R1)
  // UB_R2_M1: Seed 1 vs Winner (5v12)
  // UB_R2_M2: Seed 4 vs Winner (8v9)
  // UB_R2_M3: Seed 2 vs Winner (6v11)
  // UB_R2_M4: Seed 3 vs Winner (7v10)
  const top4Seeds = [1, 4, 2, 3];
  const ubR2: BracketMatch[] = top4Seeds.map((seed, idx) => ({
    id: `UB_R2_M${idx + 1}`,
    stageId,
    round: 2,
    positionInRound: idx + 1,
    matchNumber: idx + 1,
    bestOf: 3,
    teamA: teamMap.get(seed) ?? null, // Top Seed ยืนรอ
    teamB: null, // รอจาก UB R1
    winner: null,
    winnerToNodeId: `UB_R3_M${Math.floor(idx / 2) + 1}`,
    winnerToSlot: idx % 2 === 0 ? 'team_a' : 'team_b',
    loserToNodeId: `LB_R2_M${idx + 1}`,
    loserToSlot: 'team_b',
    status: 'PENDING',
    bracketType: 'UPPER',
  }));

  // UB R3: Semi Finals (2 Matches)
  const ubR3: BracketMatch[] = [1, 2].map((idx) => ({
    id: `UB_R3_M${idx}`,
    stageId,
    round: 3,
    positionInRound: idx,
    matchNumber: idx,
    bestOf: 3,
    teamA: null,
    teamB: null,
    winner: null,
    winnerToNodeId: `UB_R4_FINAL`,
    winnerToSlot: idx === 1 ? 'team_a' : 'team_b',
    loserToNodeId: `LB_R4_M${3 - idx}`,
    loserToSlot: 'team_a',
    status: 'PENDING',
    bracketType: 'UPPER',
  }));

  // UB R4: Upper Final (1 Match)
  const ubR4: BracketMatch[] = [{
    id: `UB_R4_FINAL`,
    stageId,
    round: 4,
    positionInRound: 1,
    matchNumber: 1,
    bestOf: 3,
    teamA: null,
    teamB: null,
    winner: null,
    winnerToNodeId: `GF_M1`,
    winnerToSlot: 'team_a',
    loserToNodeId: `LB_R5_FINAL`,
    loserToSlot: 'team_a',
    status: 'PENDING',
    bracketType: 'UPPER',
  }];

  // --- LOWER BRACKET (5 Rounds) ---
  // LB R1 (2 Matches: ผู้แพ้ 4 ทีมจาก UB R1)
  const lbR1: BracketMatch[] = [1, 2].map((idx) => ({
    id: `LB_R1_M${idx}`,
    stageId,
    round: 1,
    positionInRound: idx,
    matchNumber: idx,
    bestOf: 1,
    teamA: null,
    teamB: null,
    winner: null,
    winnerToNodeId: `LB_R2_M${idx * 2}`,
    winnerToSlot: 'team_a',
    loserToNodeId: null,
    loserToSlot: null,
    status: 'PENDING',
    bracketType: 'LOWER',
  }));

  // LB R2 (4 Matches)
  const lbR2: BracketMatch[] = [1, 2, 3, 4].map((idx) => ({
    id: `LB_R2_M${idx}`,
    stageId,
    round: 2,
    positionInRound: idx,
    matchNumber: idx,
    bestOf: 3,
    teamA: null,
    teamB: null,
    winner: null,
    winnerToNodeId: `LB_R3_M${Math.floor((idx - 1) / 2) + 1}`,
    winnerToSlot: idx % 2 === 1 ? 'team_a' : 'team_b',
    loserToNodeId: null,
    loserToSlot: null,
    status: 'PENDING',
    bracketType: 'LOWER',
  }));

  // LB R3 (2 Matches)
  const lbR3: BracketMatch[] = [1, 2].map((idx) => ({
    id: `LB_R3_M${idx}`,
    stageId,
    round: 3,
    positionInRound: idx,
    matchNumber: idx,
    bestOf: 3,
    teamA: null,
    teamB: null,
    winner: null,
    winnerToNodeId: `LB_R4_M${idx}`,
    winnerToSlot: 'team_b',
    loserToNodeId: null,
    loserToSlot: null,
    status: 'PENDING',
    bracketType: 'LOWER',
  }));

  // LB R4 (2 Matches)
  const lbR4: BracketMatch[] = [1, 2].map((idx) => ({
    id: `LB_R4_M${idx}`,
    stageId,
    round: 4,
    positionInRound: idx,
    matchNumber: idx,
    bestOf: 3,
    teamA: null,
    teamB: null,
    winner: null,
    winnerToNodeId: `LB_R5_FINAL`,
    winnerToSlot: idx === 1 ? 'team_a' : 'team_b',
    loserToNodeId: null,
    loserToSlot: null,
    status: 'PENDING',
    bracketType: 'LOWER',
  }));

  // LB R5: Lower Final (1 Match)
  const lbR5: BracketMatch[] = [{
    id: `LB_R5_FINAL`,
    stageId,
    round: 5,
    positionInRound: 1,
    matchNumber: 1,
    bestOf: 3,
    teamA: null,
    teamB: null,
    winner: null,
    winnerToNodeId: `GF_M1`,
    winnerToSlot: 'team_b',
    loserToNodeId: null,
    loserToSlot: null,
    status: 'PENDING',
    bracketType: 'LOWER',
  }];

  // --- GRAND FINAL ---
  const gf: BracketMatch[] = [{
    id: `GF_M1`,
    stageId,
    round: 1,
    positionInRound: 1,
    matchNumber: 1,
    bestOf: 5,
    teamA: null,
    teamB: null,
    winner: null,
    winnerToNodeId: null,
    winnerToSlot: null,
    loserToNodeId: null,
    loserToSlot: null,
    status: 'PENDING',
    bracketType: 'GRAND_FINAL',
  }];

  const allNodes = [
    ...ubR1, ...ubR2, ...ubR3, ...ubR4,
    ...lbR1, ...lbR2, ...lbR3, ...lbR4, ...lbR5,
    ...gf
  ];

  return {
    stageId,
    rounds: [ubR1, ubR2, ubR3, ubR4, lbR1, lbR2, lbR3, lbR4, lbR5, gf],
    allNodes,
  };
}

