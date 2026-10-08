// tests/lobby-access.test.ts
// ทดสอบตรรกะสิทธิ์เปิดข้อมูลห้อง Lobby: ไม่ล็อกอิน = 401 · คนนอกทีม = 403 · สตาฟและสมาชิกทีมของแมตช์นี้ผ่าน
// รัน: npx tsx --test tests/lobby-access.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { decideLobbyAccess, type LobbyAccessInput } from '@/lib/match/lobby-access';

const TEAM_A = 'team-a';
const TEAM_B = 'team-b';

function input(overrides: Partial<LobbyAccessInput> = {}): LobbyAccessInput {
  return { isAuthenticated: true, isStaff: false, teamAId: TEAM_A, teamBId: TEAM_B, memberships: [], ...overrides };
}

test('1) ไม่ล็อกอิน -> 401 แม้จะเป็นสตาฟหรือมีสมาชิกทีม', () => {
  const r = decideLobbyAccess(input({ isAuthenticated: false, isStaff: true, memberships: [{ team_id: TEAM_A }] }));
  assert.deepEqual(r.ok, false);
  if (!r.ok) {
    assert.equal(r.httpStatus, 401);
    assert.equal(r.code, 'UNAUTHORIZED');
  }
});

test('2) ล็อกอินแต่ไม่ใช่สตาฟและไม่ใช่สมาชิกทีมของแมตช์ -> 403', () => {
  const r = decideLobbyAccess(input());
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.httpStatus, 403);
    assert.equal(r.code, 'FORBIDDEN');
  }
});

test('3) สตาฟ (แอดมิน/กรรมการ) ผ่านโดยไม่ต้องเป็นสมาชิกทีม', () => {
  const r = decideLobbyAccess(input({ isStaff: true }));
  assert.deepEqual(r, { ok: true, via: 'STAFF' });
});

test('4) สมาชิก ACTIVE ของทีม A ผ่าน', () => {
  const r = decideLobbyAccess(input({ memberships: [{ team_id: TEAM_A }] }));
  assert.deepEqual(r, { ok: true, via: 'TEAM_A' });
});

test('5) สมาชิก ACTIVE ของทีม B ผ่าน', () => {
  const r = decideLobbyAccess(input({ memberships: [{ team_id: TEAM_B }] }));
  assert.deepEqual(r, { ok: true, via: 'TEAM_B' });
});

test('6) สมาชิกของทีมอื่นที่ไม่ได้แข่งแมตช์นี้ -> 403', () => {
  const r = decideLobbyAccess(input({ memberships: [{ team_id: 'team-x' }] }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.httpStatus, 403);
});

test('7) แมตช์ที่ยังไม่มีทีม (team id เป็น null) ไม่ทำให้คนนอกผ่าน', () => {
  const r = decideLobbyAccess(input({ teamAId: null, teamBId: null, memberships: [{ team_id: '' }] }));
  assert.equal(r.ok, false);
});
