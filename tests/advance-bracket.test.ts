// tests/advance-bracket.test.ts
// ทดสอบตรรกะเลื่อนสายกลาง (ใช้ร่วมกันโดย /matches/[id]/result และ /matches/[id]/report — F4)
// ใช้ DB จำลองในหน่วยความจำ ไม่แตะ Supabase จริง
// รัน: npx tsx --test tests/advance-bracket.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceBracketFromMatch } from '@/lib/bracket/advanceBracketFromMatch';

type Row = Record<string, unknown>;
type Admin = Parameters<typeof advanceBracketFromMatch>[0];

function fakeAdmin(tables: Record<string, Row[]>, failUpdateOn?: (id: unknown) => boolean) {
  const writes: Array<{ table: string; id: unknown; payload: Row }> = [];

  function from(table: string) {
    const filters: Array<[string, unknown]> = [];
    let op: 'select' | 'update' = 'select';
    let payload: Row = {};

    const matching = () => (tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v));

    const builder = {
      select: () => builder,
      update: (p: Row) => {
        op = 'update';
        payload = p;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return builder;
      },
      maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
      single: async () => {
        const row = matching()[0];
        return row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } };
      },
      then: (resolve: (v: { error: { message: string } | null }) => void) => {
        if (op !== 'update') return resolve({ error: null });
        const rows = matching();
        const id = rows[0]?.id;
        if (failUpdateOn?.(id)) return resolve({ error: { message: 'update boom' } });
        for (const r of rows) Object.assign(r, payload);
        writes.push({ table, id, payload });
        return resolve({ error: null });
      },
    };
    return builder;
  }

  return { admin: { from } as unknown as Admin, writes };
}

const NOW = '2026-10-03T13:00:00.000Z';
const A = 'team-a';
const B = 'team-b';
const C = 'team-c';
const D = 'team-d';

// semi 1 (A vs B) + semi 2 (C vs D) → final
function singleElimTables(): Record<string, Row[]> {
  return {
    bracket_nodes: [
      { id: 'n1', match_id: 'm1', winner_to_node_id: 'nf', loser_to_node_id: null, bracket_type: 'UPPER', team_a_id: A, team_b_id: B, status: 'READY' },
      { id: 'n2', match_id: 'm2', winner_to_node_id: 'nf', loser_to_node_id: null, bracket_type: 'UPPER', team_a_id: C, team_b_id: D, status: 'READY' },
      { id: 'nf', match_id: null, winner_to_node_id: null, loser_to_node_id: null, bracket_type: 'UPPER', team_a_id: null, team_b_id: null, status: 'PENDING' },
    ],
  };
}

function node(tables: Record<string, Row[]>, id: string): Row {
  return tables.bracket_nodes.find((r) => r.id === id) as Row;
}

test('F4: สองฝั่งรายงานตรงกัน → โหนดแมตช์ COMPLETED และผู้ชนะไปโหนดถัดไป', async () => {
  const tables = singleElimTables();
  const { admin } = fakeAdmin(tables);

  const res = await advanceBracketFromMatch(admin, { matchId: 'm1', teamAId: A, teamBId: B, winnerTeamId: A, nowIso: NOW });

  assert.deepEqual(res, { ok: true, advanced: true });
  assert.equal(node(tables, 'n1').status, 'COMPLETED');
  assert.equal(node(tables, 'n1').winner_team_id, A);
  assert.equal(node(tables, 'nf').team_a_id, A);
  assert.equal(node(tables, 'nf').team_b_id, null);
  assert.equal(node(tables, 'nf').status, 'PENDING'); // ยังรอคู่แข่งอีกฝั่ง
});

test('F4: ผู้ชนะจากอีกโหนดเข้าช่องว่าง → โหนดถัดไป READY', async () => {
  const tables = singleElimTables();
  const { admin } = fakeAdmin(tables);

  await advanceBracketFromMatch(admin, { matchId: 'm1', teamAId: A, teamBId: B, winnerTeamId: A, nowIso: NOW });
  await advanceBracketFromMatch(admin, { matchId: 'm2', teamAId: C, teamBId: D, winnerTeamId: D, nowIso: NOW });

  assert.equal(node(tables, 'nf').team_a_id, A);
  assert.equal(node(tables, 'nf').team_b_id, D);
  assert.equal(node(tables, 'nf').status, 'READY');
});

test('F4: เรียกซ้ำ (retry หลังพลาดครึ่งทาง) ไม่วางทีมเดิมซ้ำสองช่อง', async () => {
  const tables = singleElimTables();
  const { admin } = fakeAdmin(tables);

  await advanceBracketFromMatch(admin, { matchId: 'm1', teamAId: A, teamBId: B, winnerTeamId: A, nowIso: NOW });
  await advanceBracketFromMatch(admin, { matchId: 'm1', teamAId: A, teamBId: B, winnerTeamId: A, nowIso: NOW });

  assert.equal(node(tables, 'nf').team_a_id, A);
  assert.equal(node(tables, 'nf').team_b_id, null);
  assert.equal(node(tables, 'nf').status, 'PENDING');
});

test('F4: Double Elimination — ผู้แพ้ไปโหนด Lower Bracket', async () => {
  const tables: Record<string, Row[]> = {
    bracket_nodes: [
      { id: 'u1', match_id: 'm1', winner_to_node_id: 'u2', loser_to_node_id: 'l1', bracket_type: 'UPPER', team_a_id: A, team_b_id: B, status: 'READY' },
      { id: 'u2', match_id: null, winner_to_node_id: null, loser_to_node_id: null, bracket_type: 'UPPER', team_a_id: null, team_b_id: null, status: 'PENDING' },
      { id: 'l1', match_id: null, winner_to_node_id: null, loser_to_node_id: null, bracket_type: 'LOWER', team_a_id: null, team_b_id: null, status: 'PENDING' },
    ],
  };
  const { admin } = fakeAdmin(tables);

  const res = await advanceBracketFromMatch(admin, { matchId: 'm1', teamAId: A, teamBId: B, winnerTeamId: B, nowIso: NOW });

  assert.equal(res.ok, true);
  assert.equal(node(tables, 'u2').team_a_id, B); // ผู้ชนะ
  assert.equal(node(tables, 'l1').team_a_id, A); // ผู้แพ้
});

test('F4: แมตช์ที่ไม่อยู่ในสาย (ไม่มีโหนด) → ok แต่ไม่เขียนอะไร', async () => {
  const tables = singleElimTables();
  const { admin, writes } = fakeAdmin(tables);

  const res = await advanceBracketFromMatch(admin, { matchId: 'scrim-1', teamAId: A, teamBId: B, winnerTeamId: A, nowIso: NOW });

  assert.deepEqual(res, { ok: true, advanced: false });
  assert.equal(writes.length, 0);
});

test('F4: เขียนโหนดถัดไปไม่สำเร็จ → คืน ok:false (ให้ผู้เรียกปล่อยแมตช์ไว้ให้แอดมินสรุปผ่าน /result)', async () => {
  const tables = singleElimTables();
  const { admin } = fakeAdmin(tables, (id) => id === 'nf');

  const res = await advanceBracketFromMatch(admin, { matchId: 'm1', teamAId: A, teamBId: B, winnerTeamId: A, nowIso: NOW });

  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /boom/);
});
