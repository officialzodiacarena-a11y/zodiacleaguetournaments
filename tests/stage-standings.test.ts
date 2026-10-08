// tests/stage-standings.test.ts
// ตารางคะแนนของสายแบบเก็บคะแนน 3 / 1 / 0 (lib/tournament/stageStandings.ts)
// รัน: npx tsx --test tests/stage-standings.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStageStandings,
  type StandingMatchInput,
  type StandingTeamInput,
} from '@/lib/tournament/stageStandings';

const A: StandingTeamInput = { id: 'a', name: 'Alpha', tag: 'AAA' };
const B: StandingTeamInput = { id: 'b', name: 'Bravo', tag: 'BBB' };
const C: StandingTeamInput = { id: 'c', name: 'Charlie', tag: 'CCC' };
const D: StandingTeamInput = { id: 'd', name: 'Delta', tag: 'DDD' };

let seq = 0;
function match(p: Partial<StandingMatchInput> & Pick<StandingMatchInput, 'team_a_id' | 'team_b_id'>): StandingMatchInput {
  seq += 1;
  return {
    id: `m${seq}`,
    status: 'COMPLETED',
    outcome: 'NORMAL',
    winner_team_id: null,
    score_a: null,
    score_b: null,
    ...p,
  };
}

function row(rows: ReturnType<typeof computeStageStandings>, id: string) {
  const r = rows.find((x) => x.teamId === id);
  assert.ok(r, `ต้องมีทีม ${id} ในตาราง`);
  return r;
}

test('1) ชนะ 2–0: ผู้ชนะ 3 แต้ม ผู้แพ้ 0 · แมพได้/เสียถูกต้อง', () => {
  const rows = computeStageStandings([A, B], [match({ team_a_id: 'a', team_b_id: 'b', winner_team_id: 'a', score_a: 2, score_b: 0 })]);
  const a = row(rows, 'a');
  const b = row(rows, 'b');
  assert.deepEqual([a.points, a.wins, a.draws, a.losses, a.played, a.mapsWon, a.mapsLost, a.mapDiff], [3, 1, 0, 0, 1, 2, 0, 2]);
  assert.deepEqual([b.points, b.wins, b.draws, b.losses, b.played, b.mapsWon, b.mapsLost, b.mapDiff], [0, 0, 0, 1, 1, 0, 2, -2]);
  assert.deepEqual(rows.map((r) => r.teamId), ['a', 'b']);
  assert.deepEqual(rows.map((r) => r.rank), [1, 2]);
});

test('2) เสมอ 1–1 (DRAW ไม่มีผู้ชนะ): ทั้งคู่ 1 แต้ม และนับในคอลัมน์เสมอ', () => {
  const rows = computeStageStandings([A, B], [match({ team_a_id: 'a', team_b_id: 'b', outcome: 'DRAW', score_a: 1, score_b: 1 })]);
  for (const id of ['a', 'b']) {
    const r = row(rows, id);
    assert.deepEqual([r.points, r.wins, r.draws, r.losses, r.played], [1, 0, 1, 0, 1]);
  }
  assert.deepEqual(rows.map((r) => r.rank), [1, 1]);
});

test('3) สองทีมไม่มา (WALKOVER ไม่มีผู้ชนะ): ทั้งคู่ 0 แต้ม นับเป็นแพ้ทั้งคู่ ไม่ใช่เสมอ', () => {
  const rows = computeStageStandings([A, B], [match({ team_a_id: 'a', team_b_id: 'b', status: 'WALKOVER', outcome: 'WALKOVER' })]);
  for (const id of ['a', 'b']) {
    const r = row(rows, id);
    assert.deepEqual([r.points, r.wins, r.draws, r.losses, r.played], [0, 0, 0, 1, 1]);
  }
});

test('4) ชนะบาย (WALKOVER มีผู้ชนะ): ผู้ชนะ 3 แต้ม', () => {
  const rows = computeStageStandings([A, B], [match({ team_a_id: 'a', team_b_id: 'b', status: 'WALKOVER', outcome: 'WALKOVER', winner_team_id: 'b' })]);
  const b = row(rows, 'b');
  assert.deepEqual([b.points, b.wins], [3, 1]);
  assert.equal(row(rows, 'a').points, 0);
  assert.equal(rows[0].teamId, 'b');
});

test('5) สถานะ LIVE · AWAITING_RESULT · CANCELLED · BYE ไม่ถูกนับ', () => {
  const ms = ['LIVE', 'AWAITING_RESULT', 'CANCELLED', 'BYE', 'SCHEDULED'].map((status) =>
    match({ team_a_id: 'a', team_b_id: 'b', status, winner_team_id: 'a', score_a: 2, score_b: 0 })
  );
  const rows = computeStageStandings([A, B], ms);
  for (const id of ['a', 'b']) {
    const r = row(rows, id);
    assert.deepEqual([r.played, r.points, r.mapsWon, r.mapsLost], [0, 0, 0, 0]);
  }
});

test('6) ทีมที่ยังไม่เคยแข่งอยู่ในตาราง ค่าเป็น 0', () => {
  const rows = computeStageStandings([A, B, C], [match({ team_a_id: 'a', team_b_id: 'b', winner_team_id: 'a', score_a: 2, score_b: 0 })]);
  assert.equal(rows.length, 3);
  const c = row(rows, 'c');
  assert.deepEqual([c.played, c.points, c.wins, c.draws, c.losses, c.mapsWon, c.mapsLost, c.mapDiff], [0, 0, 0, 0, 0, 0, 0, 0]);
});

test('7) แต้มเท่ากัน 2 ทีม: ทีมที่ชนะกันเองอยู่สูงกว่า (แม้ผลต่างแมพรวมน้อยกว่า)', () => {
  // A กับ B แต้มเท่ากัน 6 ทั้งคู่ · B ชนะ A กันเอง 2–0 แต่ A ชนะ C และ D ด้วยผลต่างแมพที่มากกว่า
  const ms = [
    match({ team_a_id: 'a', team_b_id: 'b', winner_team_id: 'b', score_a: 0, score_b: 2 }),
    match({ team_a_id: 'a', team_b_id: 'c', winner_team_id: 'a', score_a: 2, score_b: 0 }),
    match({ team_a_id: 'a', team_b_id: 'd', winner_team_id: 'a', score_a: 2, score_b: 0 }),
    match({ team_a_id: 'b', team_b_id: 'c', winner_team_id: 'b', score_a: 2, score_b: 1 }),
    match({ team_a_id: 'b', team_b_id: 'd', winner_team_id: 'd', score_a: 0, score_b: 2 }),
  ];
  const rows = computeStageStandings([A, B, C, D], ms);
  assert.equal(row(rows, 'a').points, 6);
  assert.equal(row(rows, 'b').points, 6);
  // A มีผลต่างแมพรวมสูงกว่า B แต่ B ชนะ A กันเอง → B ต้องอยู่เหนือ A
  assert.ok(row(rows, 'a').mapDiff > row(rows, 'b').mapDiff);
  const order = rows.map((r) => r.teamId);
  assert.ok(order.indexOf('b') < order.indexOf('a'));
});

test('8) แต้มเท่ากันและพบกันเองเสมอ: เรียงด้วยผลต่างแมพ แล้วด้วยแมพที่ชนะรวม', () => {
  // A เสมอ B 1–1 · A ชนะ C 2–0 · B ชนะ C 2–1 → A และ B แต้ม 4 เท่ากัน พบกันเองเสมอ
  const ms = [
    match({ team_a_id: 'a', team_b_id: 'b', outcome: 'DRAW', score_a: 1, score_b: 1 }),
    match({ team_a_id: 'a', team_b_id: 'c', winner_team_id: 'a', score_a: 2, score_b: 0 }),
    match({ team_a_id: 'b', team_b_id: 'c', winner_team_id: 'b', score_a: 2, score_b: 1 }),
  ];
  const rows = computeStageStandings([A, B, C], ms);
  assert.equal(row(rows, 'a').points, 4);
  assert.equal(row(rows, 'b').points, 4);
  // ผลต่างแมพ: A = (1+2)-(1+0) = +2 · B = (1+2)-(1+1) = +1 → A สูงกว่า
  assert.deepEqual(rows.map((r) => r.teamId), ['a', 'b', 'c']);
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3]);

  // ผลต่างแมพเท่ากัน → ใช้แมพที่ชนะรวม
  const ms2 = [
    match({ team_a_id: 'a', team_b_id: 'b', outcome: 'DRAW', score_a: 1, score_b: 1 }),
    match({ team_a_id: 'a', team_b_id: 'c', winner_team_id: 'a', score_a: 2, score_b: 1 }), // A: ได้ 3 เสีย 2 = +1
    match({ team_a_id: 'b', team_b_id: 'c', winner_team_id: 'b', score_a: 2, score_b: 1 }), // B: ได้ 3 เสีย 2 = +1
  ];
  const rows2 = computeStageStandings([A, B, C], ms2);
  assert.equal(row(rows2, 'a').mapDiff, row(rows2, 'b').mapDiff);
  assert.equal(row(rows2, 'a').mapsWon, row(rows2, 'b').mapsWon);
  // เท่ากันทุกข้อ → อันดับเท่ากัน (กรณีข้อ 9)
  assert.equal(row(rows2, 'a').rank, row(rows2, 'b').rank);

  const ms3 = [
    match({ team_a_id: 'a', team_b_id: 'b', outcome: 'DRAW', score_a: 1, score_b: 1 }),
    match({ team_a_id: 'a', team_b_id: 'c', winner_team_id: 'a', score_a: 2, score_b: 1 }), // A: ได้ 3 เสีย 2 = +1
    match({ team_a_id: 'b', team_b_id: 'd', winner_team_id: 'b', score_a: 3, score_b: 2 }), // B: ได้ 4 เสีย 3 = +1 แมพที่ชนะรวมมากกว่า
    match({ team_a_id: 'c', team_b_id: 'd', outcome: 'DRAW', score_a: 1, score_b: 1 }),
  ];
  const rows3 = computeStageStandings([A, B, C, D], ms3);
  assert.equal(row(rows3, 'a').points, 4);
  assert.equal(row(rows3, 'b').points, 4);
  assert.equal(row(rows3, 'a').mapDiff, row(rows3, 'b').mapDiff);
  assert.ok(row(rows3, 'b').mapsWon > row(rows3, 'a').mapsWon);
  const order3 = rows3.map((r) => r.teamId);
  assert.ok(order3.indexOf('b') < order3.indexOf('a'));
});

test('9) เท่ากันทุกข้อ: rank ซ้ำ (1, 1, 3) และเรียงตามชื่อ', () => {
  // A เสมอ B 1–1 · ทั้งคู่ไม่มีแมตช์อื่น · C แพ้ทั้งสองไม่ได้แข่ง → C ไม่มีแต้ม
  const ms = [match({ team_a_id: 'b', team_b_id: 'a', outcome: 'DRAW', score_a: 1, score_b: 1 })];
  const rows = computeStageStandings([B, A, C], ms);
  assert.deepEqual(rows.map((r) => r.teamId), ['a', 'b', 'c']);
  assert.deepEqual(rows.map((r) => r.rank), [1, 1, 3]);
});

test('10) score เป็น null ไม่ทำให้พัง (ใช้ 0)', () => {
  const rows = computeStageStandings([A, B], [match({ team_a_id: 'a', team_b_id: 'b', winner_team_id: 'a', score_a: null, score_b: null })]);
  const a = row(rows, 'a');
  assert.deepEqual([a.points, a.mapsWon, a.mapsLost, a.mapDiff], [3, 0, 0, 0]);
});

test('11) ข้อมูลไม่ถูกต้องไม่ถูกนับ: ผู้ชนะไม่ตรงกับสองทีม · ทีมไม่อยู่ในรายชื่อ · ไม่มีทีม', () => {
  const ms = [
    match({ team_a_id: 'a', team_b_id: 'b', winner_team_id: 'zzz' }),
    match({ team_a_id: 'a', team_b_id: 'x', winner_team_id: 'a' }),
    match({ team_a_id: null, team_b_id: 'b', winner_team_id: 'b' }),
  ];
  const rows = computeStageStandings([A, B], ms);
  for (const id of ['a', 'b']) assert.deepEqual([row(rows, id).played, row(rows, id).points], [0, 0]);
});
