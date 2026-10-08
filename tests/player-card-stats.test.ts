import test from 'node:test';
import assert from 'node:assert/strict';
import { pickCardStats, formatKd, formatAdr, isStrongKd } from '../lib/team/playerCardStats';

const row = (o: Partial<Parameters<typeof pickCardStats>[0][number]>) => ({
  player_id: 'p', game_id: 'g', season_id: null, avg_kd: 1, avg_adr: 100, updated_at: '2026-01-01T00:00:00Z', ...o,
});

test('ไม่มีแถว = null ทั้งคู่ (ไม่แสดงของปลอม)', () => {
  assert.deepEqual(pickCardStats([], 'p', 'g'), { avgKd: null, avgAdr: null });
  assert.deepEqual(pickCardStats([row({ player_id: 'x' })], 'p', 'g'), { avgKd: null, avgAdr: null });
  assert.deepEqual(pickCardStats([row({ game_id: 'other' })], 'p', 'g'), { avgKd: null, avgAdr: null });
});

test('ใช้แถวสะสม (season_id null) ก่อน', () => {
  const r = pickCardStats([row({ season_id: 's1', avg_kd: 9, updated_at: '2026-05-01T00:00:00Z' }), row({ avg_kd: '1.85', avg_adr: '247.4' })], 'p', 'g');
  assert.deepEqual(r, { avgKd: 1.85, avgAdr: 247.4 });
});

test('ไม่มีแถวสะสม ใช้แถวที่อัปเดตล่าสุด', () => {
  const r = pickCardStats([row({ season_id: 'a', avg_kd: 1, updated_at: '2026-01-01T00:00:00Z' }), row({ season_id: 'b', avg_kd: 2.2, updated_at: '2026-03-01T00:00:00Z' })], 'p', 'g');
  assert.equal(r.avgKd, 2.2);
});

test('format และเกณฑ์สี', () => {
  assert.equal(formatKd(2.409), '2.41');
  assert.equal(formatKd(null), '—');
  assert.equal(formatAdr(283.6), '284');
  assert.equal(formatAdr(null), '—');
  assert.equal(isStrongKd(2), true);
  assert.equal(isStrongKd(1.99), false);
  assert.equal(isStrongKd(null), false);
});
