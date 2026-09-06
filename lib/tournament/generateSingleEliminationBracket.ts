// Pure bracket-shape planner for single-elimination stages (T2.2-A05).
// No DB I/O here on purpose -- this only computes the round/slot structure
// and byes from a seeded team list, so it can be unit-tested without a
// database. The route handler turns this plan into bracket_nodes rows.

export interface SeededTeam {
  team_id: string;
  seed: number;
}

export interface PlannedNode {
  round_number: number;
  position_in_round: number;
  team_a_id: string | null;
  team_b_id: string | null;
  // true only for a genuine round-1 bye slot (one seed doesn't exist because
  // the bracket size is rounded up to the next power of 2). A later-round
  // node that happens to have both sides pre-filled by two byes is a normal
  // ready match, not a bye itself.
  is_bye: boolean;
  status: 'READY' | 'PENDING' | 'COMPLETED';
  // index into the returned rounds array this node's winner advances to,
  // null for the final round
  winner_to: { round: number; position: number; slot: 'A' | 'B' } | null;
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Standard "top seeds meet last" bracket ordering, e.g. size 8 -> [1,8,4,5,2,7,3,6]
// (pairs: 1v8, 4v5, 2v7, 3v6)
export function seedOrder(bracketSize: number): number[] {
  let seeds = [1, 2];
  let size = 2;
  while (size < bracketSize) {
    const sum = size * 2 + 1;
    const next: number[] = [];
    for (const s of seeds) next.push(s, sum - s);
    seeds = next;
    size *= 2;
  }
  return seeds;
}

export function planSingleEliminationBracket(teams: SeededTeam[]): PlannedNode[][] {
  const teamCount = teams.length;
  if (teamCount < 2) {
    throw new Error('need at least 2 teams to generate a bracket');
  }

  const bracketSize = nextPowerOfTwo(teamCount);
  const totalRounds = Math.log2(bracketSize);
  const teamBySeed = new Map(teams.map((t) => [t.seed, t.team_id]));
  const order = seedOrder(bracketSize);

  interface Slot {
    teamA: string | null;
    teamB: string | null;
    isBye: boolean;
  }

  const roundsSlots: Slot[][] = [];

  // Round 1: pair up the seed order directly
  const round1: Slot[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const seedA = order[i * 2];
    const seedB = order[i * 2 + 1];
    const teamA = seedA <= teamCount ? teamBySeed.get(seedA) ?? null : null;
    const teamB = seedB <= teamCount ? teamBySeed.get(seedB) ?? null : null;
    round1.push({ teamA, teamB, isBye: teamA === null || teamB === null });
  }
  roundsSlots.push(round1);

  // Later rounds: only pre-fill a side when the feeding slot was a genuine
  // bye (its winner is already known with certainty); otherwise leave null
  // until a real match resolves it.
  for (let r = 1; r < totalRounds; r++) {
    const prev = roundsSlots[r - 1];
    const slots: Slot[] = [];
    for (let i = 0; i < prev.length / 2; i++) {
      const left = prev[i * 2];
      const right = prev[i * 2 + 1];
      const teamA = left.isBye ? left.teamA ?? left.teamB : null;
      const teamB = right.isBye ? right.teamA ?? right.teamB : null;
      slots.push({ teamA, teamB, isBye: false });
    }
    roundsSlots.push(slots);
  }

  return roundsSlots.map((slots, rIdx) =>
    slots.map((slot, i) => {
      const isFinal = rIdx === roundsSlots.length - 1;
      const status: PlannedNode['status'] = slot.isBye
        ? 'COMPLETED'
        : slot.teamA && slot.teamB
          ? 'READY'
          : 'PENDING';

      return {
        round_number: rIdx + 1,
        position_in_round: i + 1,
        team_a_id: slot.teamA,
        team_b_id: slot.teamB,
        is_bye: slot.isBye,
        status,
        winner_to: isFinal
          ? null
          : { round: rIdx + 2, position: Math.floor(i / 2) + 1, slot: i % 2 === 0 ? 'A' : 'B' },
      };
    })
  );
}
