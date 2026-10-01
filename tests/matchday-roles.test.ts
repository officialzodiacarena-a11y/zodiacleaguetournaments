// tests/matchday-roles.test.ts
// ทดสอบ F1 (report-result ถูกปิด → 410 ไม่เขียน DB) และ helper ตรวจ role หลายบทบาท (F2/F3)
// รัน: npx tsx --test tests/matchday-roles.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAnyRole, MATCH_STAFF_ROLES } from '@/lib/auth/hasAnyRole';
import { POST as reportResultPost } from '@/app/api/v1/tournament/bracket/report-result/route';

test('F1: report-result ตอบ 410 และบอกให้ใช้ /matches/[id]/result โดยไม่ต้องล็อกอิน/ไม่แตะ DB', async () => {
  // route ไม่ import supabase เลย → เรียกได้ตรง ๆ โดยไม่มี session / env
  const res = await reportResultPost();
  assert.equal(res.status, 410);
  const json = (await res.json()) as { error: { code: string; message: string } };
  assert.equal(json.error.code, 'GONE');
  assert.match(json.error.message, /\/api\/v1\/matches\/\[id\]\/result/);
});

test('F3: ผู้ใช้หลาย role (ATHLETE + ADMIN) ผ่าน', () => {
  assert.equal(hasAnyRole([{ role: 'ATHLETE' }, { role: 'ADMIN' }], MATCH_STAFF_ROLES), true);
});

test('F3: ลำดับแถวไม่มีผล (ADMIN มาก่อนหรือหลัง ATHLETE ก็ผ่าน)', () => {
  assert.equal(hasAnyRole([{ role: 'ADMIN' }, { role: 'ATHLETE' }], MATCH_STAFF_ROLES), true);
});

test('F2/F3: REFEREE / SUPER_ADMIN เดี่ยว ๆ ผ่าน', () => {
  assert.equal(hasAnyRole([{ role: 'REFEREE' }], MATCH_STAFF_ROLES), true);
  assert.equal(hasAnyRole([{ role: 'SUPER_ADMIN' }], MATCH_STAFF_ROLES), true);
});

test('F2: ผู้ใช้ทั่วไป (ATHLETE / TEAM_MANAGER / MARKETPLACE_ADMIN) ไม่ผ่าน → 403', () => {
  assert.equal(hasAnyRole([{ role: 'ATHLETE' }], MATCH_STAFF_ROLES), false);
  assert.equal(hasAnyRole([{ role: 'ATHLETE' }, { role: 'TEAM_MANAGER' }], MATCH_STAFF_ROLES), false);
  assert.equal(hasAnyRole([{ role: 'MARKETPLACE_ADMIN' }], MATCH_STAFF_ROLES), false);
});

test('F2: ไม่มี role เลย / null / undefined ไม่ผ่าน', () => {
  assert.equal(hasAnyRole([], MATCH_STAFF_ROLES), false);
  assert.equal(hasAnyRole(null, MATCH_STAFF_ROLES), false);
  assert.equal(hasAnyRole(undefined, MATCH_STAFF_ROLES), false);
});
