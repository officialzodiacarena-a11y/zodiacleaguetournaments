// Pure schedule planner for round-robin / group-stage stages (T2.2-B04).
// Same philosophy as the other two generators: no DB I/O, just computes the
// group split and the match schedule, so it can be unit-tested without a
// database. The route handler turns this plan into bracket_nodes rows and
// tournament_registrations.group_label writes.
//
// Structural difference from single/double elimination: round robin has no
// bracket graph. Every match is independent -- who plays whom is fixed by
// the schedule, not by a previous match's winner -- so there is no
// source_a/source_b/winner_to/loser_to to compute here at all. Standings
// (who advances out of the group) are a separate concern this task doesn't
// cover.
//
// format_config shape, resolved (not specified anywhere else in the spec,
// so documenting the decision rather than guessing silently):
//   - `groups`: positive integer, number of groups. Defaults to 1, which
//     covers plain ROUND_ROBIN (the whole field is one group) the same way
//     GROUP_STAGE with groups >= 2 covers a split field -- there is no
//     separate code path per `format` string, just this one number.
//   - `double_round`: boolean. When true, every pair meets twice (a mirrored
//     second half of the schedule with sides swapped), doubling the round
//     count.
//
// Group assignment uses snake-draft distribution by `seed` (1 -> group A,
// 2 -> group B, ..., then reverses direction each full pass) so that group
// strength stays balanced regardless of how many groups are requested --
// the standard way to split a seeded field without hand-picking groups.

import { type SeededTeam } from './generateSingleEliminationBracket';

export type { SeededTeam };

export interface RoundRobinGroup {
  label: string; // 'A', 'B', 'C', ...
  team_ids: string[];
}

export interface PlannedRoundRobinNode {
  // Position numbering is offset per group (group index * POSITION_BLOCK)
  // so that different groups' matches never collide in the
  // (stage_id, bracket_type, round_number, position_in_round) uniqueness
  // constraint, even though each group schedules its own rounds
  // independently and round counts can differ between groups (e.g. a
  // 4-team group takes 3 rounds, a 5-team group takes 5). round_number is
  // therefore a per-group round index, not a shared tournament-wide
  // matchday -- there is no requirement in this task that groups' rounds
  // line up as simultaneous matchdays.
  round_number: number;
  position_in_round: number;
  team_a_id: string;
  team_b_id: string;
}

export interface RoundRobinPlan {
  groups: RoundRobinGroup[];
  nodes: PlannedRoundRobinNode[];
}

const POSITION_BLOCK = 100_000; // generous headroom above any realistic matches-per-round count

function snakeGroups(teams: SeededTeam[], groupCount: number): SeededTeam[][] {
  const sorted = [...teams].sort((a, b) => a.seed - b.seed);
  const groups: SeededTeam[][] = Array.from({ length: groupCount }, () => []);
  sorted.forEach((team, i) => {
    const round = Math.floor(i / groupCount);
    const pos = i % groupCount;
    const g = round % 2 === 0 ? pos : groupCount - 1 - pos;
    groups[g].push(team);
  });
  return groups;
}

// Standard round-robin "circle method": fix the first team, rotate the rest
// one seat each round. Produces n-1 rounds for even n (each team plays
// exactly once per round); for odd n a placeholder BYE seat is added to
// make it even, and whichever real team lands opposite BYE in a given round
// simply has no match that round (no row is emitted for it -- round robin
// has no "auto-advance" bye concept the way elimination brackets do, a team
// just sits out).
function circleMethodRounds(teamIds: string[]): Array<Array<[string, string]>> {
  const BYE = Symbol('bye');
  const seats: Array<string | typeof BYE> = [...teamIds];
  if (seats.length % 2 !== 0) seats.push(BYE);
  const n = seats.length;
  const rounds: Array<Array<[string, string]>> = [];

  const arr = [...seats];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== BYE && b !== BYE) pairs.push([a as string, b as string]);
    }
    rounds.push(pairs);
    // Rotate everyone except the fixed seat 0.
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return rounds;
}

export function planRoundRobinBracket(
  teams: SeededTeam[],
  options: { groups?: number; doubleRound?: boolean } = {}
): RoundRobinPlan {
  const groupCount = options.groups ?? 1;
  const doubleRound = options.doubleRound ?? false;

  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > 26) {
    throw new Error(`format_config.groups must be an integer from 1 to 26 (got ${groupCount})`);
  }
  if (teams.length < groupCount * 2) {
    throw new Error(
      `not enough teams (${teams.length}) to fill ${groupCount} group(s) with at least 2 teams each`
    );
  }

  const teamGroups = snakeGroups(teams, groupCount);
  const groups: RoundRobinGroup[] = teamGroups.map((g, i) => ({
    label: String.fromCharCode(65 + i),
    team_ids: g.map((t) => t.team_id),
  }));

  const nodes: PlannedRoundRobinNode[] = [];

  groups.forEach((group, groupIndex) => {
    let scheduleRounds = circleMethodRounds(group.team_ids);
    if (doubleRound) {
      const returnLeg = scheduleRounds.map((round) => round.map(([a, b]): [string, string] => [b, a]));
      scheduleRounds = [...scheduleRounds, ...returnLeg];
    }

    scheduleRounds.forEach((pairs, roundIdx) => {
      pairs.forEach(([teamA, teamB], matchIdx) => {
        nodes.push({
          round_number: roundIdx + 1,
          position_in_round: groupIndex * POSITION_BLOCK + matchIdx + 1,
          team_a_id: teamA,
          team_b_id: teamB,
        });
      });
    });
  });

  return { groups, nodes };
}
