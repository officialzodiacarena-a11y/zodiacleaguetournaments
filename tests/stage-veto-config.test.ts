// tests/stage-veto-config.test.ts
// ทดสอบตัวตรวจ veto_format + map_pool ของ Stage (lib/veto/stageConfig.ts) ที่ 3 ทางเขียนใช้ร่วมกัน
// รัน: npx tsx --test tests/stage-veto-config.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { INVALID_VETO_CONFIG, defaultVetoFormat, resolveStageVetoConfig } from '@/lib/veto/stageConfig';

// ชื่อสมมติ (ไม่ใช่รายชื่อแมพจริง) ใช้ทดสอบจำนวนและความซ้ำเท่านั้น
const POOL_7 = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];
const DEFAULT_FORMAT = { sequence: ['BAN', 'BAN', 'PICK', 'PICK', 'DECIDER'], team_a_first: true, time_limit_seconds: 60 };

test('ค่าเริ่มต้นต้องเป็นลำดับเดิม BAN, BAN, PICK, PICK, DECIDER · A ก่อน · 60 วินาที', () => {
  assert.deepEqual(defaultVetoFormat(), DEFAULT_FORMAT);
});

test('ไม่ส่ง veto_format (undefined) → ได้ค่าเริ่มต้น และไม่ถูกปฏิเสธแม้ยังไม่มี map_pool', () => {
  const r = resolveStageVetoConfig({});
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(r.veto_format, DEFAULT_FORMAT);
    assert.equal(r.map_pool, null);
  }
});

test('veto_format เป็น null หรือ {} → ได้ค่าเริ่มต้น', () => {
  for (const veto_format of [null, {}]) {
    const r = resolveStageVetoConfig({ veto_format });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.veto_format, DEFAULT_FORMAT);
  }
});

test('ลำดับขั้นผิดรูป → ถูกปฏิเสธ พร้อมโค้ดและข้อความไทยบอกสเต็ปที่ผิด', () => {
  const r = resolveStageVetoConfig({ veto_format: { sequence: ['BAN', 'KICK', 'DECIDER'] } });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.code, INVALID_VETO_CONFIG);
    assert.ok(r.problems.some((p) => p.includes('สเต็ป 2') && p.includes('KICK')));
    assert.ok(r.message.startsWith('ตั้งค่า Veto ของรอบแข่งไม่ถูกต้อง'));
  }
});

test('DECIDER ไม่ใช่สเต็ปสุดท้าย → ถูกปฏิเสธ', () => {
  const r = resolveStageVetoConfig({ veto_format: { sequence: ['BAN', 'DECIDER', 'PICK'] } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.problems.some((p) => p.includes('DECIDER ต้องเป็นสเต็ปสุดท้าย')));
});

test('veto_format ไม่ใช่ object (ข้อความ / อาร์เรย์ / ตัวเลข) → ถูกปฏิเสธ ไม่ถูกแทนด้วยค่าเริ่มต้นเงียบๆ', () => {
  for (const veto_format of ['BAN,BAN,PICK', ['BAN', 'PICK'], 5, true]) {
    const r = resolveStageVetoConfig({ veto_format });
    assert.equal(r.ok, false, `ต้องปฏิเสธ ${JSON.stringify(veto_format)}`);
    if (!r.ok) assert.equal(r.code, INVALID_VETO_CONFIG);
  }
});

test('แมพน้อยกว่าจำนวนสเต็ป → ถูกปฏิเสธ', () => {
  const r = resolveStageVetoConfig({ veto_format: DEFAULT_FORMAT, map_pool: ['m1', 'm2', 'm3'] });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.problems.some((p) => p.includes('จำนวนสเต็ป (5) มากกว่าจำนวนแมพใน Pool (3)')));
});

test('map_pool ว่าง [] หรือมีแมพซ้ำ → ถูกปฏิเสธ', () => {
  const empty = resolveStageVetoConfig({ map_pool: [] });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.ok(empty.problems.includes('map_pool ว่าง'));

  const dup = resolveStageVetoConfig({ map_pool: ['m1', 'M1', 'm2', 'm3', 'm4', 'm5'] });
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.ok(dup.problems.includes('map_pool มีแมพซ้ำ'));
});

test('map_pool ไม่ใช่อาร์เรย์ของข้อความ → ถูกปฏิเสธ', () => {
  for (const map_pool of ['m1,m2', [1, 2, 3, 4, 5], { a: 1 }]) {
    const r = resolveStageVetoConfig({ map_pool });
    assert.equal(r.ok, false, `ต้องปฏิเสธ ${JSON.stringify(map_pool)}`);
  }
});

test('ค่าถูกต้อง (ลำดับ 5 สเต็ป + แมพ 7 ตัว) → ผ่าน และคืนค่าที่ส่งมาตามเดิม', () => {
  const r = resolveStageVetoConfig({ veto_format: DEFAULT_FORMAT, map_pool: POOL_7 });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(r.veto_format, DEFAULT_FORMAT);
    assert.deepEqual(r.map_pool, POOL_7);
  }
});

test('ค่าเริ่มต้น + แมพครบ → ผ่าน (รอบแข่งที่สร้างโดยไม่กรอกเพิ่มจะผ่านเมื่อมี map_pool)', () => {
  const r = resolveStageVetoConfig({ map_pool: POOL_7 });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.veto_format, DEFAULT_FORMAT);
});

test('ลำดับกำหนดเอง 3 สเต็ปที่ถูกต้อง → ผ่านและไม่ถูกแทนที่ด้วยค่าเริ่มต้น', () => {
  const custom = { sequence: ['BAN', 'PICK', 'DECIDER'], team_a_first: false, time_limit_seconds: 30 };
  const r = resolveStageVetoConfig({ veto_format: custom });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.veto_format, custom);
});
