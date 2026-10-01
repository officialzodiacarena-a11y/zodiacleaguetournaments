// tests/matchday-roles.test.ts
// ทดสอบ F1 (report-result ถูกปิด → 410 ไม่เขียน DB) และ helper ตรวจ role หลายบทบาท (F2/F3)
// รัน: npx tsx --test tests/matchday-roles.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAnyRole, playerHasAnyRole, MATCH_STAFF_ROLES } from '@/lib/auth/hasAnyRole';
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

// F3: จำลอง query chain ของ supabase — เส้นทางเดียวที่ helper เรียกคือ from().select().eq().is() (ไม่มี .single())
// ถ้า helper กลับไปใช้ .single() จะ throw "single is not a function" ทำให้เทสต์พัง
type FakeClient = Parameters<typeof playerHasAnyRole>[0];
function fakeRolesClient(result: { data: Array<{ role: string }> | null; error: unknown }): FakeClient {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => Promise.resolve(result),
  };
  return { from: () => chain } as unknown as FakeClient;
}

test('F3: playerHasAnyRole — ATHLETE + ADMIN (หลายแถวจาก DB) → ผ่าน', async () => {
  const c = fakeRolesClient({ data: [{ role: 'ATHLETE' }, { role: 'ADMIN' }], error: null });
  assert.equal(await playerHasAnyRole(c, 'p1'), true);
});

test('F2: playerHasAnyRole — ผู้ใช้ทั่วไป → ไม่ผ่าน', async () => {
  const c = fakeRolesClient({ data: [{ role: 'ATHLETE' }], error: null });
  assert.equal(await playerHasAnyRole(c, 'p1'), false);
});

test('F2/F3: playerHasAnyRole — DB error → ไม่ผ่าน (fail closed)', async () => {
  const c = fakeRolesClient({ data: [{ role: 'ADMIN' }], error: { message: 'boom' } });
  assert.equal(await playerHasAnyRole(c, 'p1'), false);
});