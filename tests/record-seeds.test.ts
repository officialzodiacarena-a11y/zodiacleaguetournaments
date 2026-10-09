import test from 'node:test';
import assert from 'node:assert/strict';
import { recordTournamentSeeds, type SeedWriterClient } from '../lib/tournament/recordSeeds';

type Call = { table: string; values: Record<string, number | null>; filters: Record<string, string> };

function fakeClient(opts: { failOn?: (c: Call) => boolean } = {}) {
  const calls: Call[] = [];
  const client: SeedWriterClient = {
    from(table) {
      return {
        update(values) {
          const call: Call = { table, values, filters: {} };
          calls.push(call);
          const q = {
            eq(col: string, val: string) {
              call.filters[col] = val;
              return q;
            },
            then<T1, T2>(
              onfulfilled?: ((v: { error: { message: string } | null }) => T1 | PromiseLike<T1>) | null,
              onrejected?: ((r: unknown) => T2 | PromiseLike<T2>) | null
            ) {
              const error = opts.failOn?.(call) ? { message: 'boom' } : null;
              return Promise.resolve({ error }).then(onfulfilled, onrejected);
            },
          };
          return q as never;
        },
      };
    },
  };
  return { client, calls };
}

test('เคลียร์ซีดเดิมก่อน แล้วเขียนซีดทีละทีม', async () => {
  const { client, calls } = fakeClient();
  const r = await recordTournamentSeeds(client, 't1', [
    { team_id: 'a', seed: 1 },
    { team_id: 'b', seed: 2 },
  ]);
  assert.deepEqual(r, { ok: true, written: 2, failed: 0 });
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0].values, { seed: null });
  assert.deepEqual(calls[0].filters, { tournament_id: 't1' });
  assert.deepEqual(calls[1].values, { seed: 1 });
  assert.deepEqual(calls[1].filters, { tournament_id: 't1', team_id: 'a' });
  assert.deepEqual(calls[2].filters, { tournament_id: 't1', team_id: 'b' });
});

test('ไม่มีคอลัมน์ seed (เคลียร์ไม่ผ่าน) = หยุดทันที ไม่เขียนต่อ', async () => {
  const { client, calls } = fakeClient({ failOn: () => true });
  const r = await recordTournamentSeeds(client, 't1', [{ team_id: 'a', seed: 1 }]);
  assert.deepEqual(r, { ok: false, written: 0, failed: 1 });
  assert.equal(calls.length, 1);
});

test('บางทีมเขียนไม่ผ่าน นับแยกและไม่ล้มทั้งชุด', async () => {
  const { client } = fakeClient({ failOn: (c) => c.filters.team_id === 'b' });
  const r = await recordTournamentSeeds(client, 't1', [
    { team_id: 'a', seed: 1 },
    { team_id: 'b', seed: 99 },
    { team_id: 'c', seed: 3 },
  ]);
  assert.deepEqual(r, { ok: false, written: 2, failed: 1 });
});
