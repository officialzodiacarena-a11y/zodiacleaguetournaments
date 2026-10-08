// lib/tournament/stageStandings.ts
// ตารางคะแนนของสายแบบเก็บคะแนน (ชนะ 3 · เสมอ 1 · แพ้ 0) — ฟังก์ชันล้วน ไม่แตะฐานข้อมูล React หรือเวลาปัจจุบัน
// กติกา: SPEC_20261007-0810 หมวด 4.8 / 9 / 10 และ Tournament_Rules_Draft.md หมวด 4
//   - นับเฉพาะแมตช์ที่ปิดผลแล้ว (COMPLETED · WALKOVER · FORFEITED)
//   - มีผู้ชนะ = ผู้ชนะ 3 แต้ม ผู้แพ้ 0 · ไม่มีผู้ชนะและชนิดผล DRAW = ทั้งคู่ 1 แต้ม · ไม่มีผู้ชนะและชนิดผลอื่น = แพ้ทั้งคู่ (0 แต้ม)
//   - เรียง: แต้ม → ผลพบกันเอง (ตารางย่อยของทีมที่แต้มเท่ากัน) → ผลต่างแมพ → แมพที่ชนะรวม
//   - เท่ากันทุกข้อ = อันดับเท่ากัน เรียงตามชื่อทีมเพื่อให้ลำดับคงที่ (ไม่ทำแมตช์ตัดสินพิเศษ และไม่ทำ Buchholz ของ Swiss)

export type StandingMatchInput = {
  id: string;
  status: string;
  outcome: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  score_a: number | null;
  score_b: number | null;
};

export type StandingTeamInput = { id: string; name: string; tag: string };

export type StageStandingRow = {
  rank: number;
  teamId: string;
  name: string;
  tag: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  mapsWon: number;
  mapsLost: number;
  mapDiff: number;
};

const CLOSED_STATUSES: readonly string[] = ['COMPLETED', 'WALKOVER', 'FORFEITED'];
const WIN_POINTS = 3;
const DRAW_POINTS = 1;

type MatchResult = {
  teamA: string;
  teamB: string;
  pointsA: number;
  pointsB: number;
  mapsA: number;
  mapsB: number;
  kind: 'A' | 'B' | 'DRAW' | 'NONE';
};

// ผลของแมตช์เดียว · คืน null ถ้าแมตช์ไม่ถูกนับ (ยังไม่ปิดผล หรือข้อมูลทีมไม่ครบ/ผู้ชนะไม่ตรงกับสองทีม)
function resultOf(m: StandingMatchInput): MatchResult | null {
  if (!CLOSED_STATUSES.includes(m.status)) return null;
  const a = m.team_a_id;
  const b = m.team_b_id;
  if (!a || !b || a === b) return null;
  const mapsA = m.score_a ?? 0;
  const mapsB = m.score_b ?? 0;

  if (m.winner_team_id) {
    if (m.winner_team_id === a) return { teamA: a, teamB: b, pointsA: WIN_POINTS, pointsB: 0, mapsA, mapsB, kind: 'A' };
    if (m.winner_team_id === b) return { teamA: a, teamB: b, pointsA: 0, pointsB: WIN_POINTS, mapsA, mapsB, kind: 'B' };
    return null;
  }
  if (m.outcome === 'DRAW') {
    return { teamA: a, teamB: b, pointsA: DRAW_POINTS, pointsB: DRAW_POINTS, mapsA, mapsB, kind: 'DRAW' };
  }
  return { teamA: a, teamB: b, pointsA: 0, pointsB: 0, mapsA, mapsB, kind: 'NONE' };
}

export function computeStageStandings(teams: StandingTeamInput[], matches: StandingMatchInput[]): StageStandingRow[] {
  const rows = new Map<string, StageStandingRow>();
  for (const t of teams) {
    rows.set(t.id, {
      rank: 0,
      teamId: t.id,
      name: t.name,
      tag: t.tag,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      mapsWon: 0,
      mapsLost: 0,
      mapDiff: 0,
    });
  }

  // แมตช์ที่นับได้ และทั้งสองทีมต้องอยู่ในรายชื่อทีมที่ส่งเข้ามา
  const results: MatchResult[] = [];
  for (const m of matches) {
    const r = resultOf(m);
    if (r && rows.has(r.teamA) && rows.has(r.teamB)) results.push(r);
  }

  for (const r of results) {
    const ra = rows.get(r.teamA)!;
    const rb = rows.get(r.teamB)!;
    ra.played += 1;
    rb.played += 1;
    ra.points += r.pointsA;
    rb.points += r.pointsB;
    ra.mapsWon += r.mapsA;
    ra.mapsLost += r.mapsB;
    rb.mapsWon += r.mapsB;
    rb.mapsLost += r.mapsA;
    if (r.kind === 'A') {
      ra.wins += 1;
      rb.losses += 1;
    } else if (r.kind === 'B') {
      rb.wins += 1;
      ra.losses += 1;
    } else if (r.kind === 'DRAW') {
      ra.draws += 1;
      rb.draws += 1;
    } else {
      ra.losses += 1;
      rb.losses += 1;
    }
  }

  for (const row of rows.values()) row.mapDiff = row.mapsWon - row.mapsLost;

  // แต้มพบกันเอง: คิดเฉพาะแมตช์ระหว่างทีมที่แต้มรวมเท่ากัน
  const byPoints = new Map<number, string[]>();
  for (const row of rows.values()) {
    const list = byPoints.get(row.points) ?? [];
    list.push(row.teamId);
    byPoints.set(row.points, list);
  }
  const headToHead = new Map<string, number>();
  for (const row of rows.values()) headToHead.set(row.teamId, 0);
  for (const ids of byPoints.values()) {
    if (ids.length < 2) continue;
    const group = new Set(ids);
    for (const r of results) {
      if (!group.has(r.teamA) || !group.has(r.teamB)) continue;
      headToHead.set(r.teamA, (headToHead.get(r.teamA) ?? 0) + r.pointsA);
      headToHead.set(r.teamB, (headToHead.get(r.teamB) ?? 0) + r.pointsB);
    }
  }

  const h2h = (id: string): number => headToHead.get(id) ?? 0;
  const sorted = Array.from(rows.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (h2h(y.teamId) !== h2h(x.teamId)) return h2h(y.teamId) - h2h(x.teamId);
    if (y.mapDiff !== x.mapDiff) return y.mapDiff - x.mapDiff;
    if (y.mapsWon !== x.mapsWon) return y.mapsWon - x.mapsWon;
    if (x.name < y.name) return -1;
    if (x.name > y.name) return 1;
    return x.teamId < y.teamId ? -1 : x.teamId > y.teamId ? 1 : 0;
  });

  // อันดับ: เท่ากันทุกข้อ (แต้ม · พบกันเอง · ผลต่างแมพ · แมพที่ชนะ) ได้อันดับเดียวกัน แล้วข้ามเลข (1, 1, 3)
  let prev: StageStandingRow | null = null;
  sorted.forEach((row, i) => {
    const tied =
      prev !== null &&
      prev.points === row.points &&
      h2h(prev.teamId) === h2h(row.teamId) &&
      prev.mapDiff === row.mapDiff &&
      prev.mapsWon === row.mapsWon;
    row.rank = tied && prev ? prev.rank : i + 1;
    prev = row;
  });

  return sorted;
}
