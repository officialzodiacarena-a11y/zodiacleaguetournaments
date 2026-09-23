// Run: npx tsx --test tests/match-game-rows.test.ts
// ล็อกรายชื่อก่อนแมพ (สร้างแถว LIVE) แล้ว END MAP ต้องอัปเดตแถวเดิม ไม่ชน unique (match_id, game_number)
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureLiveGameRow, saveFinishedGame, LIVE_GAME_STATUS } from '@/lib/overlay/match-game-rows';

type Row = Record<string, unknown> & { id: string; match_id: string; game_number: number; status: string };

// Supabase query builder จำลองแบบย่อ — รองรับเฉพาะ chain ที่ match-game-rows.ts ใช้ พร้อม unique (match_id, game_number)
function fakeDb(rows: Row[] = []) {
  let seq = 0;
  const table = {
    rows,
    from() {
      let filters: Record<string, unknown> = {};
      let op: { kind: 'select' } | { kind: 'insert'; values: Record<string, unknown> } | { kind: 'update'; values: Record<string, unknown> } = { kind: 'select' };
      const matches = () => rows.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
      const run = () => {
        if (op.kind === 'insert') {
          const values = op.values;
          if (rows.some((r) => r.match_id === values.match_id && r.game_number === values.game_number)) {
            return { data: null, error: { code: '23505', message: 'duplicate key' } };
          }
          const row = { id: `g${++seq}`, ...values } as Row;
          rows.push(row);
          return { data: row, error: null };
        }
        if (op.kind === 'update') {
          const hit = matches();
          const values = op.values;
          hit.forEach((r) => Object.assign(r, values));
          return { data: hit[0] ?? null, error: null };
        }
        return { data: matches()[0] ?? null, error: null };
      };
      const builder = {
        select: () => builder,
        insert: (values: Record<string, unknown>) => ((op = { kind: 'insert', values }), builder),
        update: (values: Record<string, unknown>) => ((op = { kind: 'update', values }), builder),
        eq: (k: string, v: unknown) => ((filters = { ...filters, [k]: v }), builder),
        maybeSingle: async () => run(),
        single: async () => run(),
      };
      return builder;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return table as any;
}

const MATCH = 'm1';

test('ensureLiveGameRow สร้างแถว LIVE เมื่อยังไม่มีเกมนั้น', async () => {
  const db = fakeDb();
  const res = await ensureLiveGameRow(db, MATCH, 1, 'Bind');
  assert.ok('id' in res);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].status, LIVE_GAME_STATUS);
  assert.equal(db.rows[0].map_name, 'Bind');
});

test('ensureLiveGameRow ใช้แถวเดิมถ้ามีอยู่แล้ว (ล็อกซ้ำไม่สร้างแถวใหม่)', async () => {
  const db = fakeDb([{ id: 'existing', match_id: MATCH, game_number: 1, status: 'LIVE' }]);
  const res = await ensureLiveGameRow(db, MATCH, 1, 'Bind');
  assert.deepEqual(res, { id: 'existing' });
  assert.equal(db.rows.length, 1);
});

test('saveFinishedGame อัปเดตแถว LIVE เดิมเป็น COMPLETED แทนการ insert ซ้ำ', async () => {
  const db = fakeDb();
  const live = await ensureLiveGameRow(db, MATCH, 1, 'Bind');
  assert.ok('id' in live);
  const { data, error } = await saveFinishedGame(db, MATCH, { game_number: 1, score_a: 13, score_b: 9, status: 'COMPLETED' });
  assert.equal(error, null);
  assert.equal(db.rows.length, 1);
  assert.equal(data?.id, live.id);
  assert.equal(db.rows[0].status, 'COMPLETED');
  assert.equal(db.rows[0].score_a, 13);
});

test('saveFinishedGame insert ตามเดิมเมื่อไม่ได้ล็อกรายชื่อไว้ก่อน', async () => {
  const db = fakeDb();
  const { error } = await saveFinishedGame(db, MATCH, { game_number: 2, status: 'COMPLETED' });
  assert.equal(error, null);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].game_number, 2);
});

test('saveFinishedGame คืน 23505 ถ้าเกมนั้นจบไปแล้ว (GAME_ALREADY_REPORTED)', async () => {
  const db = fakeDb([{ id: 'done', match_id: MATCH, game_number: 1, status: 'COMPLETED' }]);
  const { error } = await saveFinishedGame(db, MATCH, { game_number: 1, status: 'COMPLETED' });
  assert.equal(error?.code, '23505');
  assert.equal(db.rows[0].id, 'done');
});
