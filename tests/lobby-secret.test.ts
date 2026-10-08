import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMatchIds, MAX_LOBBY_CODE_IDS } from '../lib/match/lobby-secret';

const A = 'd0000000-0000-0000-0000-000000000001';
const B = 'd0000000-0000-0000-0000-000000000002';

test('parseMatchIds: null / ว่าง → []', () => {
  assert.deepEqual(parseMatchIds(null), []);
  assert.deepEqual(parseMatchIds(''), []);
});

test('parseMatchIds: แยกด้วย , ตัดช่องว่างและตัดซ้ำ', () => {
  assert.deepEqual(parseMatchIds(` ${A}, ${B} ,${A}`), [A, B]);
});

test('parseMatchIds: ทิ้งค่าที่ไม่ใช่ uuid (กัน injection เข้า .in())', () => {
  assert.deepEqual(parseMatchIds(`${A},1;drop table x,abc,"${B}"`), [A]);
});

test(`parseMatchIds: จำกัดไม่เกิน ${MAX_LOBBY_CODE_IDS} รายการ`, () => {
  const many = Array.from({ length: 80 }, (_, i) => `d0000000-0000-0000-0000-${String(i).padStart(12, '0')}`).join(',');
  assert.equal(parseMatchIds(many).length, MAX_LOBBY_CODE_IDS);
});
