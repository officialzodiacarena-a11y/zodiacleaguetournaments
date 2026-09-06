// Pure bracket-shape planner for double-elimination stages (T2.2-B03).
// Same philosophy as generateSingleEliminationBracket.ts: no DB I/O, just
// computes bracket_nodes structure so it can be unit-tested without a
// database. The route handler turns this plan into actual rows.
//
// SCOPE LIMITATION (flagging explicitly rather than shipping a silent bug):
// this generator only supports team counts that are an exact power of two
// (4, 8, 16, 32, ...) -- it rejects everything else with a clear error
// instead of generating a lower bracket with structural gaps.
//
// Why: single-elimination byes are self-contained (a bye in round 1 just
// pre-fills round 2's slot; nothing downstream needs to know it happened).
// Double elimination doesn't have that property, because upper-bracket
// byes don't produce a loser to feed the lower bracket at all. With m
// upper-round-1 matches and `byes` of them being byes, the lower bracket's
// first round needs `byes` "loser" slots that will simply never be filled.
// Whenever `byes > m / 2`, pigeonhole guarantees at least one lower-bracket
// round-1 match ends up paired with TWO missing losers -- a match that can
// structurally never happen. That case needs lower-bracket round *sizes*
// that shrink dynamically to absorb byes (the same bracketing problem as
// the upper bracket, but recursively, on a non-power-of-2 and *changing*
// input each round) -- meaningfully more work than this task's scope.
// Concretely this hits real inputs too, not just extreme ones: 5 teams in
// an 8-slot bracket has 3 byes against 4 upper-round-1 matches (m/2 = 2),
// so it already trips this. Round the field to a power of two (add/remove
// teams, or run a play-in stage first) or use SINGLE_ELIMINATION / ROUND_ROBIN
// until a bye-aware lower bracket is built as a follow-up.

import { type SeededTeam, nextPowerOfTwo, seedOrder } from './generateSingleEliminationBracket';

export type { SeededTeam };

export type DEBracketType = 'UPPER' | 'LOWER' | 'GRAND_FINAL';

export interface DENodeRef {
  bracket_type: DEBracketType;
  round: number;
  position: number;
}

export interface PlannedDENode {
  bracket_type: DEBracketType;
  round_number: number;
  position_in_round: number;
  team_a_id: string | null;
  team_b_id: string | null;
  is_bye: boolean;
  status: 'READY' | 'PENDING';
  // Explicit both ways (unlike the single-elim planner, which only carries
  // winner_to and lets the route re-derive source_a/b from position math).
  // Double elimination's cross-bracket links -- an UPPER loser landing in
  // LOWER, a LOWER winner meeting a fresh UPPER dropout -- don't follow a
  // simple position*2-1/position*2 relationship, so source and destination
  // are recorded together, once, at the moment each link is created.
  source_a: { ref: DENodeRef; outcome: 'WINNER' | 'LOSER' } | null;
  source_b: { ref: DENodeRef; outcome: 'WINNER' | 'LOSER' } | null;
  winner_to: { ref: DENodeRef; slot: 'A' | 'B' } | null;
  // Only ever set on UPPER nodes -- a LOWER-bracket loss is a full
  // elimination, and the GRAND_FINAL's loser_to is intentionally left null:
  // per T2.2-B03 scope, the bracket-reset node (if the LOWER team wins
  // Grand Final match 1) is created later at result-recording time (D05),
  // not pre-generated here.
  loser_to: { ref: DENodeRef; slot: 'A' | 'B' } | null;
}

export function planDoubleEliminationBracket(teams: SeededTeam[]): PlannedDENode[] {
  const teamCount = teams.length;
  const bracketSize = nextPowerOfTwo(teamCount);
  if (teamCount < 4 || bracketSize !== teamCount) {
    throw new Error(
      `double elimination generator only supports exact power-of-2 team counts right now ` +
        `(got ${teamCount} teams; nearest valid sizes are 4, 8, 16, 32...) -- see the ` +
        `SCOPE LIMITATION comment in generateDoubleEliminationBracket.ts`
    );
  }

  const n = Math.log2(bracketSize); // upper bracket rounds; n >= 2 here
  const m = bracketSize / 2; // upper round 1 match count
  const teamBySeed = new Map(teams.map((t) => [t.seed, t.team_id]));
  const order = seedOrder(bracketSize);

  const nodes = new Map<string, PlannedDENode>();
  const key = (bt: DEBracketType, r: number, p: number) => `${bt}:${r}:${p}`;

  function makeNode(
    bracket_type: DEBracketType,
    round_number: number,
    position_in_round: number,
    team_a_id: string | null = null,
    team_b_id: string | null = null,
    status: 'READY' | 'PENDING' = 'PENDING'
  ): PlannedDENode {
    const node: PlannedDENode = {
      bracket_type,
      round_number,
      position_in_round,
      team_a_id,
      team_b_id,
      is_bye: false,
      status,
      source_a: null,
      source_b: null,
      winner_to: null,
      loser_to: null,
    };
    nodes.set(key(bracket_type, round_number, position_in_round), node);
    return node;
  }

  function get(bt: DEBracketType, r: number, p: number): PlannedDENode {
    const node = nodes.get(key(bt, r, p));
    if (!node) throw new Error(`internal error: missing planned node ${bt}:${r}:${p}`);
    return node;
  }

  function link(from: PlannedDENode, to: PlannedDENode, outcome: 'WINNER' | 'LOSER', slot: 'A' | 'B') {
    const fromRef: DENodeRef = { bracket_type: from.bracket_type, round: from.round_number, position: from.position_in_round };
    const toRef: DENodeRef = { bracket_type: to.bracket_type, round: to.round_number, position: to.position_in_round };
    if (outcome === 'WINNER') from.winner_to = { ref: toRef, slot };
    else from.loser_to = { ref: toRef, slot };
    if (slot === 'A') to.source_a = { ref: fromRef, outcome };
    else to.source_b = { ref: fromRef, outcome };
  }

  // --- Phase A: create every node (upper, lower, grand final) up front, so
  // linking (phase B) can look up any node regardless of build order. ---

  // Upper round 1: real seeds, standard "top seeds meet last" pairing.
  for (let i = 1; i <= m; i++) {
    const seedA = order[(i - 1) * 2];
    const seedB = order[(i - 1) * 2 + 1];
    const teamA = teamBySeed.get(seedA) ?? null;
    const teamB = teamBySeed.get(seedB) ?? null;
    makeNode('UPPER', 1, i, teamA, teamB, 'READY');
  }
  // Upper rounds 2..n: teams unknown until earlier rounds are played.
  for (let r = 2; r <= n; r++) {
    const count = bracketSize / 2 ** r;
    for (let i = 1; i <= count; i++) makeNode('UPPER', r, i);
  }

  // Lower bracket: round 2k-1 and 2k both have m / 2^k matches, for
  // k = 1..n-1. Round 2(n-1) is the Lower Final.
  const lowerRounds = 2 * (n - 1);
  for (let lr = 1; lr <= lowerRounds; lr++) {
    const k = Math.ceil(lr / 2);
    const count = m / 2 ** k;
    for (let i = 1; i <= count; i++) makeNode('LOWER', lr, i);
  }

  makeNode('GRAND_FINAL', 1, 1);

  // --- Phase B: wire every link. ---

  // Upper winner progression: round r winner -> round r+1.
  for (let r = 1; r < n; r++) {
    const count = bracketSize / 2 ** r;
    for (let i = 1; i <= count; i++) {
      const from = get('UPPER', r, i);
      const to = get('UPPER', r + 1, Math.ceil(i / 2));
      link(from, to, 'WINNER', i % 2 === 1 ? 'A' : 'B');
    }
  }
  // Upper Final winner -> Grand Final slot A.
  link(get('UPPER', n, 1), get('GRAND_FINAL', 1, 1), 'WINNER', 'A');

  // Lower round 1: upper round-1 losers, paired (i, m+1-i) so a team isn't
  // immediately re-paired with the exact mirror of who it just lost near.
  // (A pairing heuristic, not a rematch guarantee -- see file header.)
  for (let i = 1; i <= m / 2; i++) {
    const a = get('UPPER', 1, i);
    const b = get('UPPER', 1, m - i + 1);
    const target = get('LOWER', 1, i);
    link(a, target, 'LOSER', 'A');
    link(b, target, 'LOSER', 'B');
  }

  // Lower rounds 3, 5, 7... ("winners-only" rounds): winners of the previous
  // lower round play each other, same (i, count+1-i) pairing heuristic.
  for (let k = 2; k <= n - 1; k++) {
    const prevRound = 2 * (k - 1);
    const prevCount = m / 2 ** (k - 1);
    const thisRound = 2 * k - 1;
    const thisCount = m / 2 ** k;
    for (let i = 1; i <= thisCount; i++) {
      const a = get('LOWER', prevRound, i);
      const b = get('LOWER', prevRound, prevCount - i + 1);
      const target = get('LOWER', thisRound, i);
      link(a, target, 'WINNER', 'A');
      link(b, target, 'WINNER', 'B');
    }
  }

  // Lower rounds 2, 4, 6... ("cross-in" rounds): winners of the previous
  // lower round meet the freshly-dropped losers of upper round k+1.
  // Round 2(n-1) of this loop (k = n-1) is exactly the Lower Final, fed by
  // the Upper Final's loser.
  for (let k = 1; k <= n - 1; k++) {
    const lbOddRound = 2 * k - 1;
    const lbEvenRound = 2 * k;
    const count = m / 2 ** k;
    for (let i = 1; i <= count; i++) {
      const lbWinnerSrc = get('LOWER', lbOddRound, i);
      const urLoserSrc = get('UPPER', k + 1, count - i + 1);
      const target = get('LOWER', lbEvenRound, i);
      link(lbWinnerSrc, target, 'WINNER', 'A');
      link(urLoserSrc, target, 'LOSER', 'B');
    }
  }

  // Lower Final winner -> Grand Final slot B.
  link(get('LOWER', lowerRounds, 1), get('GRAND_FINAL', 1, 1), 'WINNER', 'B');

  return Array.from(nodes.values());
}
