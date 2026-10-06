// tests/ready-access.test.ts
// ทดสอบตรรกะสิทธิ์กด Ready (O12): ห้ามผู้ใช้ทั่วไปตั้งตัวเองเป็นผู้นำทีม, ผู้นำทีมกดได้เฉพาะทีมตัวเอง, สตาฟกดแทนได้
// รัน: npx tsx --test tests/ready-access.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  READY_WINDOW_MS,
  decideReadyAccess,
  effectiveReadyDeadline,
  firstPressDeadlineMs,
  isReadyDeadlinePassed,
  isStaffRole,
  scheduleBaseMs,
  type ReadyAccessInput,
} from '@/lib/match/ready-access';

const TEAM_A = 'team-a';
const TEAM_B = 'team-b';

function input(overrides: Partial<ReadyAccessInput> = {}): ReadyAccessInput {
  return {
    rawSide: null,
    teamAId: TEAM_A,
    teamBId: TEAM_B,
    teamAReadyAt: null,
    isStaff: false,
    memberships: [],
    ...overrides,
  };
}

function expectFail(result: ReturnType<typeof decideReadyAccess>, code: string, httpStatus: number) {
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, code);
    assert.equal(result.httpStatus, httpStatus);
  }
}

test('O12: ผู้ใช้ทั่วไปที่ไม่ได้อยู่ทีม กดระบุ side ไม่ได้ (เดิมถูกตั้งเป็น CAPTAIN)', () => {
  expectFail(decideReadyAccess(input({ rawSide: 'team_a' })), 'FORBIDDEN', 403);
  expectFail(decideReadyAccess(input({ rawSide: 'team_b' })), 'FORBIDDEN', 403);
});

test('O12: ผู้ใช้ทั่วไปที่ไม่ได้อยู่ทีม กดโดยไม่ระบุ side ไม่ได้ (เดิมถูกจับนั่งทีมที่ว่าง)', () => {
  expectFail(decideReadyAccess(input()), 'FORBIDDEN', 403);
});

test('O12: สมาชิกทีม A ระบุ side = team_b ไม่ได้ (เดิมกลายเป็นสมาชิกทั้งสองทีม)', () => {
  const memberships = [{ team_id: TEAM_A, role: 'CAPTAIN' }];
  expectFail(decideReadyAccess(input({ rawSide: 'team_b', memberships })), 'FORBIDDEN', 403);
});

test('กัปตันกด Ready ให้ทีมตัวเองได้ ทั้งแบบระบุ side และไม่ระบุ', () => {
  const memberships = [{ team_id: TEAM_B, role: 'CAPTAIN' }];
  const withSide = decideReadyAccess(input({ rawSide: 'team_b', memberships }));
  assert.deepEqual(withSide, { ok: true, side: 'B', teamId: TEAM_B });
  const noSide = decideReadyAccess(input({ memberships }));
  assert.deepEqual(noSide, { ok: true, side: 'B', teamId: TEAM_B });
});

test('OWNER / MANAGER / COACH กดให้ทีมตัวเองได้', () => {
  for (const role of ['OWNER', 'MANAGER', 'COACH']) {
    const result = decideReadyAccess(input({ memberships: [{ team_id: TEAM_A, role }] }));
    assert.deepEqual(result, { ok: true, side: 'A', teamId: TEAM_A }, role);
  }
});

test('PLAYER / SUBSTITUTE กด Ready แทนทีมไม่ได้', () => {
  for (const role of ['PLAYER', 'SUBSTITUTE']) {
    const memberships = [{ team_id: TEAM_A, role }];
    expectFail(decideReadyAccess(input({ memberships })), 'FORBIDDEN', 403);
    expectFail(decideReadyAccess(input({ rawSide: 'team_a', memberships })), 'FORBIDDEN', 403);
  }
});

test('บัญชีที่เป็นผู้นำของทั้งสองทีม (ข้อมูลเก่าจาก O12) ต้องระบุ side', () => {
  const memberships = [
    { team_id: TEAM_A, role: 'CAPTAIN' },
    { team_id: TEAM_B, role: 'CAPTAIN' },
  ];
  expectFail(decideReadyAccess(input({ memberships })), 'SIDE_REQUIRED', 400);
  assert.deepEqual(decideReadyAccess(input({ rawSide: 'team_a', memberships })), { ok: true, side: 'A', teamId: TEAM_A });
});

test('สตาฟกด Ready แทนทีมใดก็ได้ โดยไม่ต้องเป็นสมาชิก', () => {
  assert.deepEqual(decideReadyAccess(input({ isStaff: true, rawSide: 'team_a' })), { ok: true, side: 'A', teamId: TEAM_A });
  assert.deepEqual(decideReadyAccess(input({ isStaff: true, rawSide: 'team_b' })), { ok: true, side: 'B', teamId: TEAM_B });
});

test('สตาฟที่ไม่ระบุ side กดให้ฝั่งที่ยังไม่ Ready ก่อน (พฤติกรรมเดิม)', () => {
  assert.deepEqual(decideReadyAccess(input({ isStaff: true })), { ok: true, side: 'A', teamId: TEAM_A });
  const teamAReady = decideReadyAccess(input({ isStaff: true, teamAReadyAt: '2026-09-22T00:00:00.000Z' }));
  assert.deepEqual(teamAReady, { ok: true, side: 'B', teamId: TEAM_B });
});

test('ฝั่งที่ยังไม่มีทีม กด Ready ไม่ได้ แม้เป็นสตาฟ', () => {
  expectFail(decideReadyAccess(input({ isStaff: true, rawSide: 'team_a', teamAId: null })), 'TEAM_NOT_ASSIGNED', 422);
  expectFail(decideReadyAccess(input({ isStaff: true, teamAId: null, teamAReadyAt: null, teamBId: null })), 'TEAM_NOT_ASSIGNED', 422);
});

test('ค่า side ที่ไม่รู้จักถูกปฏิเสธ 400 (ไม่ตีความเป็นทีม B เงียบ ๆ)', () => {
  expectFail(decideReadyAccess(input({ isStaff: true, rawSide: 'team_c' })), 'INVALID_SIDE', 400);
  expectFail(decideReadyAccess(input({ isStaff: true, rawSide: 1 })), 'INVALID_SIDE', 400);
});

test('บทบาทสตาฟ: ADMIN / SUPER_ADMIN / REFEREE นับ แต่ CASTER และ ATHLETE ไม่นับ', () => {
  assert.equal(isStaffRole(['ATHLETE', 'ADMIN']), true);
  assert.equal(isStaffRole(['SUPER_ADMIN']), true);
  assert.equal(isStaffRole(['REFEREE']), true);
  assert.equal(isStaffRole(['CASTER']), false);
  assert.equal(isStaffRole(['ATHLETE', 'TEAM_MANAGER', 'ORG_OWNER']), false);
  assert.equal(isStaffRole([]), false);
});

// กติกา A7: เลยเส้นตาย 15 นาทีแล้วกดพร้อมไม่ได้ — กฎ "เลยเส้นตายหรือยัง" อยู่ที่ isReadyDeadlinePassed ที่เดียว
test('isReadyDeadlinePassed: ไม่มีเส้นตาย (null) → false', () => {
  assert.equal(isReadyDeadlinePassed(null, Date.now()), false);
});

test('isReadyDeadlinePassed: ข้อความที่ไม่ใช่เวลา → false', () => {
  assert.equal(isReadyDeadlinePassed('not-a-date', Date.now()), false);
});

test('isReadyDeadlinePassed: เส้นตายอยู่ข้างหน้า 1 วินาที → false', () => {
  const now = Date.parse('2026-10-06T12:00:00.000Z');
  assert.equal(isReadyDeadlinePassed(new Date(now + 1000).toISOString(), now), false);
});

test('isReadyDeadlinePassed: เท่ากับเวลาปัจจุบันพอดี → true', () => {
  const now = Date.parse('2026-10-06T12:00:00.000Z');
  assert.equal(isReadyDeadlinePassed(new Date(now).toISOString(), now), true);
});

test('isReadyDeadlinePassed: เลยเส้นตายมาแล้ว 1 วินาที → true', () => {
  const now = Date.parse('2026-10-06T12:00:00.000Z');
  assert.equal(isReadyDeadlinePassed(new Date(now - 1000).toISOString(), now), true);
});
// ===== ส่วน A: เส้นตายกดพร้อมนับจากเวลานัด =====
const T0 = Date.parse('2026-10-06T10:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

function deadlineInput(o: Partial<Parameters<typeof effectiveReadyDeadline>[0]> = {}) {
  return {
    forfeitDeadlineAt: null,
    scheduledAt: null,
    createdAt: null,
    teamAReadyAt: null,
    teamBReadyAt: null,
    ...o,
  };
}

test('เวลานัดอนาคต: เส้นตาย = เวลานัด + 15 นาที', () => {
  const result = effectiveReadyDeadline(deadlineInput({ scheduledAt: iso(T0 + 3600_000), createdAt: iso(T0) }));
  assert.equal(result, iso(T0 + 3600_000 + READY_WINDOW_MS));
});

test('เวลานัดผ่านแล้วแต่แมตช์เพิ่งสร้าง: นับจากเวลาสร้าง', () => {
  const result = effectiveReadyDeadline(deadlineInput({ scheduledAt: iso(T0 - 3600_000), createdAt: iso(T0) }));
  assert.equal(result, iso(T0 + READY_WINDOW_MS));
  assert.equal(scheduleBaseMs(iso(T0 - 3600_000), iso(T0)), T0);
});

test('ไม่มีเวลานัด (ว่างหรืออ่านไม่ออก): ไม่มีเส้นตาย', () => {
  assert.equal(effectiveReadyDeadline(deadlineInput({ createdAt: iso(T0) })), null);
  assert.equal(effectiveReadyDeadline(deadlineInput({ scheduledAt: 'not-a-date', createdAt: iso(T0) })), null);
  assert.equal(scheduleBaseMs(null, iso(T0)), null);
});

test('มีทีมกดพร้อมแล้วแต่ forfeit_deadline_at ว่าง: ไม่มีเส้นตายจากเวลานัด', () => {
  const result = effectiveReadyDeadline(
    deadlineInput({ scheduledAt: iso(T0), createdAt: iso(T0 - 1000), teamAReadyAt: iso(T0 + 1000) }),
  );
  assert.equal(result, null);
});

test('forfeit_deadline_at มีค่า: ใช้ค่านั้น', () => {
  const result = effectiveReadyDeadline(
    deadlineInput({ forfeitDeadlineAt: iso(T0 + 5000), scheduledAt: iso(T0 + 3600_000), createdAt: iso(T0) }),
  );
  assert.equal(result, iso(T0 + 5000));
});

test('ทีมแรกกดก่อนเวลานัด: เส้นตาย = เวลานัด + 15 นาที', () => {
  const ms = firstPressDeadlineMs(T0, iso(T0 + 3600_000), iso(T0 - 1000));
  assert.equal(ms, T0 + 3600_000 + READY_WINDOW_MS);
});

test('ทีมแรกกดหลังเวลานัด: เส้นตาย = เวลากด + 15 นาที', () => {
  const ms = firstPressDeadlineMs(T0 + 600_000, iso(T0), iso(T0 - 1000));
  assert.equal(ms, T0 + 600_000 + READY_WINDOW_MS);
  assert.equal(firstPressDeadlineMs(T0, null, null), T0 + READY_WINDOW_MS);
});
