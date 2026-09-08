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

  // 12 teams is a common non-power-of-2 field size (byes = bracketSize/2
  // exactly, the one case the SCOPE LIMITATION below can still handle
  // cleanly) -- planned separately below rather than folded into the
  // power-of-2 loop, since its lower-bracket shape doesn't follow the
  // uniform round-doubling pattern the general algorithm relies on.
  if (teamCount === 12) {
    return planDoubleElimination12(teams);
  }

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

// ── 12-team double elimination ──────────────────────────────────────────
//
// 12 doesn't fit the power-of-2 loop above: seeds 1-4 bye straight into
// Upper Round 2 (standard for this field size), so Upper Round 1 is only
// an 8-team bracket among seeds 5-12. That means only 4 losers enter the
// lower bracket after Upper R1, then another 4 after Upper R2 -- 2 + 4 = 6
// entrants feeding a round that can't split into even pairs the way the
// generic power-of-2 algorithm assumes.
//
// Round-by-round shape (verified against the standard total-match count
// for double elimination, 2*N-2 = 22 matches for N=12: 11 upper + 10 lower
// + 1 grand final):
//   UPPER R1 (4 matches): seeds 5-12, standard "top seeds meet last" pairing
//   UPPER R2 (4 matches): seeds 1-4 (bye) vs UPPER R1 winners
//   UPPER R3 (2 matches): semifinals
//   UPPER R4 (1 match):   upper final
//   LOWER R1 (2 matches): the 4 UPPER R1 losers
//   LOWER R2 (3 matches): 2 LOWER R1 winners each meet one UPPER R2 loser;
//                         the remaining 2 UPPER R2 losers play each other
//   LOWER R3 (1 match):   the two "met a fresh dropout" LOWER R2 winners
//                         play each other; the winner of the "two dropouts"
//                         LOWER R2 match instead skips straight to LOWER R4
//                         (an unavoidable bye once the field stops being a
//                         clean power of 2 -- see the SCOPE LIMITATION
//                         comment above)
//   LOWER R4 (2 matches): the two LOWER R3-stage winners each meet one of
//                         the 2 UPPER R3 (semifinal) losers
//   LOWER R5 (1 match):   lower semifinal
//   LOWER R6 (1 match):   lower final, vs the UPPER R4 (upper final) loser
//   GRAND FINAL (1 match): UPPER R4 winner vs LOWER R6 winner
function planDoubleElimination12(teams: SeededTeam[]): PlannedDENode[] {
  if (teams.length !== 12) {
    throw new Error(`planDoubleElimination12 requires exactly 12 teams (got ${teams.length})`);
  }

  const teamBySeed = new Map(teams.map((t) => [t.seed, t.team_id]));
  for (let seed = 1; seed <= 12; seed++) {
    if (!teamBySeed.has(seed)) {
      throw new Error(`double elimination 12-team bracket requires seeds 1-12; missing seed ${seed}`);
    }
  }

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

  const seed = (s: number) => teamBySeed.get(s)!;

  // UPPER R1: seeds 5-12 only, standard mini 8-bracket seeding (local ranks
  // 1-8 = seeds 5-12 -> pairs [1,8][4,5][2,7][3,6] -> [5,12][8,9][6,11][7,10]).
  makeNode('UPPER', 1, 1, seed(5), seed(12), 'READY');
  makeNode('UPPER', 1, 2, seed(8), seed(9), 'READY');
  makeNode('UPPER', 1, 3, seed(6), seed(11), 'READY');
  makeNode('UPPER', 1, 4, seed(7), seed(10), 'READY');

  // UPPER R2: seeds 1-4 bye in, waiting for their UPPER R1 opponent.
  makeNode('UPPER', 2, 1, seed(1), null, 'PENDING');
  makeNode('UPPER', 2, 2, seed(4), null, 'PENDING');
  makeNode('UPPER', 2, 3, seed(2), null, 'PENDING');
  makeNode('UPPER', 2, 4, seed(3), null, 'PENDING');

  makeNode('UPPER', 3, 1); // semifinal
  makeNode('UPPER', 3, 2); // semifinal
  makeNode('UPPER', 4, 1); // upper final

  makeNode('LOWER', 1, 1);
  makeNode('LOWER', 1, 2);
  makeNode('LOWER', 2, 1);
  makeNode('LOWER', 2, 2);
  makeNode('LOWER', 2, 3);
  makeNode('LOWER', 3, 1);
  makeNode('LOWER', 4, 1);
  makeNode('LOWER', 4, 2);
  makeNode('LOWER', 5, 1); // lower semifinal
  makeNode('LOWER', 6, 1); // lower final

  makeNode('GRAND_FINAL', 1, 1);

  // UPPER progression.
  link(get('UPPER', 1, 1), get('UPPER', 2, 1), 'WINNER', 'B');
  link(get('UPPER', 1, 2), get('UPPER', 2, 2), 'WINNER', 'B');
  link(get('UPPER', 1, 3), get('UPPER', 2, 3), 'WINNER', 'B');
  link(get('UPPER', 1, 4), get('UPPER', 2, 4), 'WINNER', 'B');
  link(get('UPPER', 1, 1), get('LOWER', 1, 1), 'LOSER', 'A');
  link(get('UPPER', 1, 2), get('LOWER', 1, 1), 'LOSER', 'B');
  link(get('UPPER', 1, 3), get('LOWER', 1, 2), 'LOSER', 'A');
  link(get('UPPER', 1, 4), get('LOWER', 1, 2), 'LOSER', 'B');

  link(get('UPPER', 2, 1), get('UPPER', 3, 1), 'WINNER', 'A');
  link(get('UPPER', 2, 2), get('UPPER', 3, 1), 'WINNER', 'B');
  link(get('UPPER', 2, 3), get('UPPER', 3, 2), 'WINNER', 'A');
  link(get('UPPER', 2, 4), get('UPPER', 3, 2), 'WINNER', 'B');
  link(get('UPPER', 2, 1), get('LOWER', 2, 1), 'LOSER', 'B');
  link(get('UPPER', 2, 2), get('LOWER', 2, 2), 'LOSER', 'B');
  link(get('UPPER', 2, 3), get('LOWER', 2, 3), 'LOSER', 'A');
  link(get('UPPER', 2, 4), get('LOWER', 2, 3), 'LOSER', 'B');

  link(get('UPPER', 3, 1), get('UPPER', 4, 1), 'WINNER', 'A');
  link(get('UPPER', 3, 2), get('UPPER', 4, 1), 'WINNER', 'B');
  link(get('UPPER', 3, 1), get('LOWER', 4, 1), 'LOSER', 'B');
  link(get('UPPER', 3, 2), get('LOWER', 4, 2), 'LOSER', 'B');

  link(get('UPPER', 4, 1), get('GRAND_FINAL', 1, 1), 'WINNER', 'A');
  link(get('UPPER', 4, 1), get('LOWER', 6, 1), 'LOSER', 'B');

  // LOWER progression.
  link(get('LOWER', 1, 1), get('LOWER', 2, 1), 'WINNER', 'A');
  link(get('LOWER', 1, 2), get('LOWER', 2, 2), 'WINNER', 'A');

  link(get('LOWER', 2, 1), get('LOWER', 3, 1), 'WINNER', 'A');
  link(get('LOWER', 2, 2), get('LOWER', 3, 1), 'WINNER', 'B');
  // LOWER R2 M3 (the "two fresh dropouts" match) has no LOWER R1 feed, so
  // its winner skips LOWER R3 entirely and waits at LOWER R4 directly --
  // the one unavoidable bye this field size produces (see file-level note).
  link(get('LOWER', 2, 3), get('LOWER', 4, 2), 'WINNER', 'A');

  link(get('LOWER', 3, 1), get('LOWER', 4, 1), 'WINNER', 'A');

  link(get('LOWER', 4, 1), get('LOWER', 5, 1), 'WINNER', 'A');
  link(get('LOWER', 4, 2), get('LOWER', 5, 1), 'WINNER', 'B');

  link(get('LOWER', 5, 1), get('LOWER', 6, 1), 'WINNER', 'A');

  link(get('LOWER', 6, 1), get('GRAND_FINAL', 1, 1), 'WINNER', 'B');

  return Array.from(nodes.values());
}
