import test from 'node:test';
import assert from 'node:assert/strict';
import { pickMatchMvp } from '../lib/tournament/matchMvp';
import { mostPlayedRole, normalizeGameRole } from '../lib/team/gameRole';

const r = (player_id: string, acs: number | string | null, kills = 10, deaths = 5) => ({ match_id: 'm', player_id, kills, deaths, acs });

test('MVP = ACS เฉลี่ยสูงสุด และคิด K/D รวมทุกเกม', () => {
  const m = pickMatchMvp([r('a', 200, 10, 10), r('a', 300, 20, 10), r('b', 240, 30, 5)]);
  assert.equal(m?.playerId, 'a');
  assert.equal(m?.acs, 250);
  assert.equal(m?.kd, 1.5);
  const m2 = pickMatchMvp([r('a', 200, 10, 10), r('b', 240, 30, 5)]);
  assert.equal(m2?.playerId, 'b');
  assert.equal(m2?.kd, 6);
});

test('ไม่มี ACS = ไม่มี MVP · สตริงตัวเลขใช้ได้', () => {
  assert.equal(pickMatchMvp([]), null);
  assert.equal(pickMatchMvp([r('a', null)]), null);
  assert.equal(pickMatchMvp([r('a', '312.50', 24, 10)])?.acs, 312.5);
});

test('deaths = 0 ไม่หารศูนย์', () => {
  assert.equal(pickMatchMvp([r('a', 200, 7, 0)])?.kd, 7);
  assert.equal(pickMatchMvp([r('a', 200, 0, 0)])?.kd, null);
});

test('ตำแหน่งที่ลงบ่อยสุด · ไม่มีข้อมูล = null', () => {
  const rows = [
    { player_id: 'p', role_played: 'duelist' },
    { player_id: 'p', role_played: 'Duelist' },
    { player_id: 'p', role_played: 'SENTINEL' },
    { player_id: 'q', role_played: 'FLEX' },
    { player_id: 'p', role_played: 'weird' },
  ];
  assert.equal(mostPlayedRole(rows, 'p'), 'DUELIST');
  assert.equal(mostPlayedRole(rows, 'zz'), null);
  assert.equal(normalizeGameRole(null), null);
  assert.equal(normalizeGameRole(' flex '), 'FLEX');
});
