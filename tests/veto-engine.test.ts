// tests/veto-engine.test.ts
// ทดสอบ Veto Step Engine: อ่านลำดับจาก veto_format, ตรวจคำสั่งตามสเต็ป, จับเวลา 60 วินาที, Auto-pick, DECIDER, ไล่เติมสเต็ปที่ค้างหลายอัน
// รัน: npx tsx --test tests/veto-engine.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentDeadlineMs,
  currentStep,
  isVetoComplete,
  parseVetoFormat,
  planAutoSteps,
  remainingMaps,
  seededRng,
  validateAction,
  validateConfig,
  vetoSideForMemberships,
  type VetoConfig,
  type VetoRowLike,
} from '@/lib/veto/engine';

const TEAM_A = 'team-a';
const TEAM_B = 'team-b';
const T0 = Date.parse('2026-09-22T12:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

// ค่าจริงใน Stage (Quarterfinals) ที่ตรวจจากฐานข้อมูล 2026-09-22
const STAGE_POOL = ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus', 'Sunset', 'Abyss'];
const STAGE_FORMAT = { sequence: ['BAN', 'BAN', 'PICK', 'PICK', 'DECIDER'], team_a_first: true, time_limit_seconds: 60 };

const ctx = (seed = 'match-1') => ({ nowMs: T0, vetoStartMs: T0, teamAId: TEAM_A, teamBId: TEAM_B, seed });
const stageConfig = () => parseVetoFormat(STAGE_FORMAT);

function manual(step: number, action: string, team: string | null, map: string, atMs: number): VetoRowLike {
  return { step_order: step, action, team_id: team, map_name: map, created_at: iso(atMs), was_auto: false };
}

test('อ่านลำดับจาก veto_format จริง: 5 สเต็ป BAN A, BAN B, PICK A, PICK B, DECIDER (60 วินาที)', () => {
  const c = stageConfig();
  assert.deepEqual(c.steps, [
    { step: 1, action: 'BAN', team: 'A' },
    { step: 2, action: 'BAN', team: 'B' },
    { step: 3, action: 'PICK', team: 'A' },
    { step: 4, action: 'PICK', team: 'B' },
    { step: 5, action: 'DECIDER', team: null },
  ]);
  assert.equal(c.timeLimitSeconds, 60);
  assert.equal(c.source, 'stage');
  assert.deepEqual(c.problems, []);
  assert.deepEqual(validateConfig(c, STAGE_POOL), []);
});

test('team_a_first = false เริ่มจากทีม B; ค่าว่างใช้ลำดับเริ่มต้น 5 สเต็ป 60 วินาที', () => {
  const b = parseVetoFormat({ sequence: ['BAN', 'BAN', 'PICK', 'PICK', 'DECIDER'], team_a_first: false, time_limit_seconds: 45 });
  assert.deepEqual(b.steps.map((s) => s.team), ['B', 'A', 'B', 'A', null]);
  assert.equal(b.timeLimitSeconds, 45);

  for (const empty of [null, undefined, {}, [], 'x']) {
    const d = parseVetoFormat(empty);
    assert.equal(d.source, 'default');
    assert.equal(d.steps.length, 5);
    assert.equal(d.timeLimitSeconds, 60);
  }

  // มี format แต่ไม่ระบุเวลา = ไม่จับเวลา
  assert.equal(parseVetoFormat({ sequence: ['BAN', 'PICK', 'DECIDER'] }).timeLimitSeconds, null);
});

test('รองรับ 7 สเต็ป และสเต็ปแบบ object ที่กำหนดทีมเอง', () => {
  const seven = parseVetoFormat({ sequence: ['BAN', 'BAN', 'PICK', 'PICK', 'BAN', 'BAN', 'DECIDER'], time_limit_seconds: 30 });
  assert.deepEqual(seven.steps.map((s) => s.team), ['A', 'B', 'A', 'B', 'A', 'B', null]);

  const custom = parseVetoFormat({ sequence: [{ action: 'BAN', team: 'B' }, { action: 'BAN', team: 'B' }, { action: 'PICK' }, 'DECIDER'] });
  assert.deepEqual(custom.steps.map((s) => [s.action, s.team]), [['BAN', 'B'], ['BAN', 'B'], ['PICK', 'A'], ['DECIDER', null]]);
});

test('config ผิดปกติถูกจับ: action ไม่รู้จัก, สเต็ปมากกว่าแมพ, แมพซ้ำ, DECIDER ไม่ใช่สเต็ปสุดท้าย, Pool ว่าง', () => {
  const badAction = parseVetoFormat({ sequence: ['BAN', 'SIDE_PICK', 'DECIDER'] });
  assert.ok(badAction.problems.length > 0);

  const tooMany = stageConfig();
  assert.ok(validateConfig(tooMany, ['Ascent', 'Bind', 'Haven', 'Split']).some((p) => p.includes('มากกว่าจำนวนแมพ')));
  assert.ok(validateConfig(tooMany, ['Ascent', 'ascent', 'Haven', 'Split', 'Lotus']).some((p) => p.includes('ซ้ำ')));
  assert.ok(validateConfig(tooMany, []).some((p) => p.includes('ว่าง')));
  const midDecider = parseVetoFormat({ sequence: ['BAN', 'DECIDER', 'PICK'] });
  assert.ok(validateConfig(midDecider, STAGE_POOL).some((p) => p.includes('DECIDER ต้องเป็นสเต็ปสุดท้าย')));
});

test('ตรวจคำสั่ง Ban/Pick: ตาของทีม, ชนิด action, แมพในลิสต์, แมพซ้ำ, ตัวพิมพ์', () => {
  const c = stageConfig();
  const rows: VetoRowLike[] = [];

  // สเต็ป 1 = ทีม A BAN
  const notTurn = validateAction(c, STAGE_POOL, rows, { side: 'B', action: 'BAN', mapName: 'Split' }, T0);
  assert.equal(!notTurn.ok && notTurn.code, 'NOT_YOUR_TURN');

  const wrongAction = validateAction(c, STAGE_POOL, rows, { side: 'A', action: 'PICK', mapName: 'Split' }, T0);
  assert.equal(!wrongAction.ok && wrongAction.code, 'WRONG_ACTION');

  const outside = validateAction(c, STAGE_POOL, rows, { side: 'A', action: 'BAN', mapName: 'Icebox' }, T0);
  assert.equal(!outside.ok && outside.code, 'INVALID_MAP');

  // action ไม่ส่งมาก็ได้ (ระบบรู้จากสเต็ป) และชื่อแมพไม่สนตัวพิมพ์ → ได้ชื่อตาม Pool
  const ok = validateAction(c, STAGE_POOL, rows, { side: 'A', mapName: '  split ' }, T0);
  assert.ok(ok.ok);
  assert.equal(ok.ok && ok.mapName, 'Split');
  assert.equal(ok.ok && ok.step.action, 'BAN');
  assert.equal(ok.ok && ok.deadlineMs, T0 + 60_000);

  rows.push(manual(1, 'BAN', TEAM_A, 'Split', T0 + 5_000));
  const dup = validateAction(c, STAGE_POOL, rows, { side: 'B', action: 'BAN', mapName: 'SPLIT' }, T0);
  assert.equal(!dup.ok && dup.code, 'MAP_ALREADY_VETOED');

  const invalidPool = validateAction(c, ['Ascent', 'Bind'], rows, { side: 'B', mapName: 'Bind' }, T0);
  assert.equal(!invalidPool.ok && invalidPool.code, 'VETO_CONFIG_INVALID');
});

test('เดินครบ 5 สเต็ปบน Pool 7 แมพ: 4 สเต็ปที่ทีมเลือก + DECIDER สุ่มจาก 3 แมพที่เหลือ (ไม่มีสเต็ป/แมพหลุด)', () => {
  const c = stageConfig();
  const rows: VetoRowLike[] = [];
  const script: Array<['A' | 'B', string, string]> = [
    ['A', 'BAN', 'Split'],
    ['B', 'BAN', 'Abyss'],
    ['A', 'PICK', 'Ascent'],
    ['B', 'PICK', 'Bind'],
  ];

  script.forEach(([side, action, map], i) => {
    const step = currentStep(c, rows);
    assert.ok(step);
    assert.equal(step.step, i + 1);
    const v = validateAction(c, STAGE_POOL, rows, { side, action, mapName: map }, T0);
    assert.ok(v.ok, JSON.stringify(v));
    rows.push(manual(v.ok ? v.step.step : 0, action, side === 'A' ? TEAM_A : TEAM_B, map, T0 + (i + 1) * 10_000));
  });

  // ถึงสเต็ป DECIDER: ผู้เล่นส่งเองไม่ได้
  const decider = validateAction(c, STAGE_POOL, rows, { side: 'A', mapName: 'Haven' }, T0);
  assert.equal(!decider.ok && decider.code, 'DECIDER_IS_AUTOMATIC');
  assert.equal(isVetoComplete(c, rows), false);
  assert.deepEqual(remainingMaps(STAGE_POOL, rows).sort(), ['Haven', 'Lotus', 'Sunset']);

  // ระบบเติม DECIDER ทันที (ไม่ต้องรอหมดเวลา) จาก 3 แมพที่เหลือ
  const planned = planAutoSteps(c, STAGE_POOL, rows, { ...ctx(), nowMs: T0 + 41_000 });
  assert.equal(planned.length, 1);
  assert.equal(planned[0].action, 'DECIDER');
  assert.equal(planned[0].step_order, 5);
  assert.equal(planned[0].team_id, null);
  assert.ok(['Haven', 'Lotus', 'Sunset'].includes(planned[0].map_name));
  rows.push(planned[0]);

  assert.equal(isVetoComplete(c, rows), true);
  assert.equal(rows.length, 5);
  assert.equal(new Set(rows.map((r) => r.map_name)).size, 5, 'ห้ามมีแมพซ้ำ');
  assert.ok(rows.every((r) => STAGE_POOL.includes(r.map_name)), 'ทุกแมพอยู่ใน Pool');
  assert.equal(currentStep(c, rows), null);
  const after = validateAction(c, STAGE_POOL, rows, { side: 'A', mapName: 'Haven' }, T0);
  assert.equal(!after.ok && after.code, 'VETO_COMPLETE');
  assert.deepEqual(planAutoSteps(c, STAGE_POOL, rows, { ...ctx(), nowMs: T0 + 999_999 }), [], 'ครบแล้วไม่มีอะไรต้องเติม');
});

test('หมดเวลา 60 วินาที: Auto-pick ตามสเต็ป (BAN/PICK ของทีมที่ถึงตา) ไม่เร็วกว่ากำหนด', () => {
  const c = stageConfig();

  assert.deepEqual(planAutoSteps(c, STAGE_POOL, [], { ...ctx(), nowMs: T0 + 59_999 }), [], 'ยังไม่หมดเวลา');

  const one = planAutoSteps(c, STAGE_POOL, [], { ...ctx(), nowMs: T0 + 60_000 });
  assert.equal(one.length, 1);
  assert.equal(one[0].step_order, 1);
  assert.equal(one[0].action, 'BAN');
  assert.equal(one[0].team_id, TEAM_A);
  assert.equal(one[0].was_auto, true);
  assert.equal(one[0].deadline_at, iso(T0 + 60_000));
  assert.equal(one[0].created_at, iso(T0 + 60_000), 'เวลาบันทึกของสเต็ปอัตโนมัติ = เวลาหมดจริง (เพื่อให้สเต็ปถัดไปนับต่อเนื่อง)');
});

test('ไม่มีใครเรียกระบบนาน: ไล่เติมสเต็ปที่ค้างทีละสเต็ปด้วยเวลาหมดจริง จนถึง DECIDER', () => {
  const c = stageConfig();

  const two = planAutoSteps(c, STAGE_POOL, [], { ...ctx(), nowMs: T0 + 130_000 });
  assert.deepEqual(two.map((r) => [r.step_order, r.action, r.team_id]), [[1, 'BAN', TEAM_A], [2, 'BAN', TEAM_B]]);
  assert.deepEqual(two.map((r) => r.created_at), [iso(T0 + 60_000), iso(T0 + 120_000)]);

  const all = planAutoSteps(c, STAGE_POOL, [], { ...ctx(), nowMs: T0 + 10 * 60_000 });
  assert.deepEqual(all.map((r) => [r.step_order, r.action]), [[1, 'BAN'], [2, 'BAN'], [3, 'PICK'], [4, 'PICK'], [5, 'DECIDER']]);
  assert.deepEqual(all.map((r) => r.team_id), [TEAM_A, TEAM_B, TEAM_A, TEAM_B, null]);
  assert.equal(new Set(all.map((r) => r.map_name)).size, 5);
  assert.ok(all.every((r) => STAGE_POOL.includes(r.map_name)));
  assert.ok(all.every((r) => r.was_auto));
  // DECIDER บันทึกทันทีหลังสเต็ป 4 หมดเวลา
  assert.equal(all[4].created_at, iso(T0 + 240_000));
});

test('สเต็ปที่ทีมกดเอง: เวลาของสเต็ปถัดไปนับจากเวลาที่กด', () => {
  const c = stageConfig();
  const rows = [manual(1, 'BAN', TEAM_A, 'Split', T0 + 20_000)];

  assert.equal(currentDeadlineMs(c, rows, T0), T0 + 80_000);
  assert.deepEqual(planAutoSteps(c, STAGE_POOL, rows, { ...ctx(), nowMs: T0 + 79_999 }), []);
  const auto = planAutoSteps(c, STAGE_POOL, rows, { ...ctx(), nowMs: T0 + 80_000 });
  assert.equal(auto.length, 1);
  assert.equal(auto[0].step_order, 2);
  assert.equal(auto[0].team_id, TEAM_B);
  assert.ok(!['Split'].includes(auto[0].map_name), 'ไม่เลือกแมพที่ถูกใช้ไปแล้ว');
});

test('ผลของ Auto-pick กำหนดจาก seed: เรียกซ้ำ/พร้อมกันได้ผลเดียวกัน และรอบถัดไปไม่เติมซ้ำ', () => {
  const c = stageConfig();
  const a = planAutoSteps(c, STAGE_POOL, [], { ...ctx('m1'), nowMs: T0 + 10 * 60_000 });
  const b = planAutoSteps(c, STAGE_POOL, [], { ...ctx('m1'), nowMs: T0 + 10 * 60_000 });
  assert.deepEqual(a, b);

  const rows: VetoRowLike[] = a.map((r) => ({ ...r }));
  assert.deepEqual(planAutoSteps(c, STAGE_POOL, rows, { ...ctx('m1'), nowMs: T0 + 20 * 60_000 }), []);

  const r1 = seededRng('x');
  const r2 = seededRng('x');
  assert.deepEqual([r1(), r1(), r1()], [r2(), r2(), r2()]);
  assert.notDeepEqual([seededRng('x')(), seededRng('y')()].length, 0);
});

test('ไม่ตั้งเวลา: ไม่มี Auto-pick ของ BAN/PICK แต่ DECIDER ยังเติมเมื่อถึงคิว', () => {
  const c: VetoConfig = parseVetoFormat({ sequence: ['BAN', 'BAN', 'PICK', 'PICK', 'DECIDER'] });
  assert.equal(c.timeLimitSeconds, null);
  assert.equal(currentDeadlineMs(c, [], T0), null);
  assert.deepEqual(planAutoSteps(c, STAGE_POOL, [], { ...ctx(), nowMs: T0 + 24 * 3600_000 }), []);

  const rows = [
    manual(1, 'BAN', TEAM_A, 'Split', T0),
    manual(2, 'BAN', TEAM_B, 'Abyss', T0),
    manual(3, 'PICK', TEAM_A, 'Ascent', T0),
    manual(4, 'PICK', TEAM_B, 'Bind', T0),
  ];
  const decider = planAutoSteps(c, STAGE_POOL, rows, { ...ctx(), nowMs: T0 });
  assert.equal(decider.length, 1);
  assert.equal(decider[0].action, 'DECIDER');
});

test('deadline: ไม่มีเมื่อถึง DECIDER หรือ Veto จบ', () => {
  const c = stageConfig();
  const four = [
    manual(1, 'BAN', TEAM_A, 'Split', T0),
    manual(2, 'BAN', TEAM_B, 'Abyss', T0),
    manual(3, 'PICK', TEAM_A, 'Ascent', T0),
    manual(4, 'PICK', TEAM_B, 'Bind', T0),
  ];
  assert.equal(currentDeadlineMs(c, four, T0), null);
  assert.equal(currentDeadlineMs(c, [...four, manual(5, 'DECIDER', null, 'Haven', T0)], T0), null);
});

test('ไม่ปล่อยให้เกินสเต็ป: Pool เล็กเกินไปทำให้ Auto-pick ไม่ทำงานและคำสั่งถูกปฏิเสธ', () => {
  const c = stageConfig();
  const tinyPool = ['Ascent', 'Bind', 'Haven', 'Split'];
  assert.deepEqual(planAutoSteps(c, tinyPool, [], { ...ctx(), nowMs: T0 + 10 * 60_000 }), []);
  const v = validateAction(c, tinyPool, [], { side: 'A', mapName: 'Ascent' }, T0);
  assert.equal(!v.ok && v.code, 'VETO_CONFIG_INVALID');
});

test('ฝั่งของผู้ใช้: ต้องเป็น CAPTAIN / MANAGER / COACH ของทีมเดียวเท่านั้น', () => {
  assert.equal(vetoSideForMemberships([{ team_id: 'ta', role: 'CAPTAIN' }], 'ta', 'tb'), 'A');
  assert.equal(vetoSideForMemberships([{ team_id: 'tb', role: 'COACH' }], 'ta', 'tb'), 'B');
  assert.equal(vetoSideForMemberships([{ team_id: 'ta', role: 'MANAGER' }], 'ta', 'tb'), 'A');
  // ผู้เล่นทั่วไป / ไม่ใช่สมาชิก / ทีมไม่ตรงแมตช์ = ไม่มีฝั่ง
  assert.equal(vetoSideForMemberships([{ team_id: 'ta', role: 'PLAYER' }], 'ta', 'tb'), null);
  assert.equal(vetoSideForMemberships([], 'ta', 'tb'), null);
  assert.equal(vetoSideForMemberships([{ team_id: 'tx', role: 'CAPTAIN' }], 'ta', 'tb'), null);
  // ผู้นำของทั้งสองทีม (ข้อมูลเก่าจาก O12) = ไม่มีฝั่ง (เดิมระบบเดาเป็นทีมแรกที่เจอ)
  assert.equal(
    vetoSideForMemberships([{ team_id: 'ta', role: 'CAPTAIN' }, { team_id: 'tb', role: 'CAPTAIN' }], 'ta', 'tb'),
    null
  );
  // ทีมที่ยังไม่ถูกจับสาย (null) ไม่ทำให้ null === null จับคู่ผิด
  assert.equal(vetoSideForMemberships([{ team_id: 'ta', role: 'CAPTAIN' }], 'ta', null), 'A');
});
