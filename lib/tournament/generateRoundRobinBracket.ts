// Pure bracket-shape planner for round-robin (and grouped round-robin) stages.
// No DB I/O here on purpose -- mirrors generateSingleEliminationBracket.ts /
// generateDoubleEliminationBracket.ts so it can be unit-tested without a
// database. The route handler (app/api/v1/stages/[id]/seed/route.ts) turns
// this plan into bracket_nodes rows and tags each team's
// tournament_registrations.group_label.

import { type SeededTeam } from './generateSingleEliminationBracket';

export type { SeededTeam };

export interface RRGroup {
  label: string;
  team_ids: string[];
}

export interface PlannedRRNode {
  round_number: number;
  position_in_round: number;
  team_a_id: string;
  team_b_id: string;
}

export interface PlannedRoundRobin {
  groups: RRGroup[];
  nodes: PlannedRRNode[];
}

export interface RoundRobinOptions {
  // number of groups to split the field into; omitted/1 = single all-play-all group
  groups?: number;
  // if true, every pairing is scheduled twice (double round-robin)
  doubleRound?: boolean;
}

// Standard "circle method": team 0 stays fixed, the rest rotate one position
// per round. Produces n-1 rounds of n/2 pairs each, every team meeting every
// other team exactly once. `null` stands in for a bye slot (odd team counts
// get one padded in by the caller), and any pair touching it is simply
// skipped -- that team sits out the round.
function circleMethodRounds(teamIds: ReadonlyArray<string | null>): (readonly [string, string])[][] {
  const n = teamIds.length;
  if (n % 2 !== 0) {
    throw new Error('circleMethodRounds requires an even team count (pad with a bye first)');
  }

  const fixed = teamIds[0];
  let rotating = teamIds.slice(1);
  const rounds: (readonly [string, string])[][] = [];

  for (let round = 0; round < n - 1; round++) {
    const seats = [fixed, ...rotating];
    const pairs: (readonly [string, string])[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = seats[i];
      const b = seats[n - 1 - i];
      if (a !== null && b !== null) {
        // alternate which side leads so the same team isn't always "team_a"
        pairs.push(round % 2 === 0 ? ([a, b] as const) : ([b, a] as const));
      }
    }
    rounds.push(pairs);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }
  return rounds;
}

function groupLabelFor(index: number, groupCount: number): string {
  return groupCount <= 1 ? 'MAIN' : String.fromCharCode(65 + index); // A, B, C...
}

export function planRoundRobinBracket(
  teams: SeededTeam[],
  options: RoundRobinOptions = {}
): PlannedRoundRobin {
  const teamCount = teams.length;
  if (teamCount < 2) {
    throw new Error('need at least 2 teams to generate a round robin schedule');
  }

  const groupCount = options.groups && options.groups > 1 ? Math.floor(options.groups) : 1;
  if (groupCount > 1 && teamCount < groupCount * 2) {
    throw new Error(`cannot split ${teamCount} teams into ${groupCount} groups of at least 2 each`);
  }

  const sorted = [...teams].sort((a, b) => a.seed - b.seed);

  // Snake draft across groups so seed strength is balanced, e.g. with 3
  // groups and seeds 1..9: A gets 1,6,7 / B gets 2,5,8 / C gets 3,4,9.
  const buckets: SeededTeam[][] = Array.from({ length: groupCount }, () => []);
  sorted.forEach((team, idx) => {
    const cycle = Math.floor(idx / groupCount);
    const posInCycle = idx % groupCount;
    const groupIdx = cycle % 2 === 0 ? posInCycle : groupCount - 1 - posInCycle;
    buckets[groupIdx].push(team);
  });

  const groups: RRGroup[] = buckets.map((bucket, i) => ({
    label: groupLabelFor(i, groupCount),
    team_ids: bucket.map((t) => t.team_id),
  }));

  // Align round numbers across groups ("matchday N" for every group at once):
  // pad every group's bucket to the size of the largest group rounded up to
  // even, so they all produce the same number of circle-method rounds.
  const largestGroup = Math.max(...buckets.map((b) => b.length));
  const paddedSize = largestGroup % 2 === 0 ? largestGroup : largestGroup + 1;

  const groupRounds = buckets.map((bucket) => {
    const ids: (string | null)[] = bucket.map((t) => t.team_id);
    while (ids.length < paddedSize) ids.push(null);
    return circleMethodRounds(ids);
  });

  const legs = options.doubleRound ? 2 : 1;
  const totalRoundsPerLeg = paddedSize - 1;
  const nodes: PlannedRRNode[] = [];

  for (let leg = 0; leg < legs; leg++) {
    for (let r = 0; r < totalRoundsPerLeg; r++) {
      const roundNumber = leg * totalRoundsPerLeg + r + 1;
      let position = 1;
      for (const rounds of groupRounds) {
        for (const [a, b] of rounds[r]) {
          const [teamA, teamB] = leg === 1 ? [b, a] : [a, b]; // 2nd leg flips sides
          nodes.push({
            round_number: roundNumber,
            position_in_round: position++,
            team_a_id: teamA,
            team_b_id: teamB,
          });
        }
      }
    }
  }

  return { groups, nodes };
}
