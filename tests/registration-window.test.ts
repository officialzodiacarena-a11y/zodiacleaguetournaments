// tests/registration-window.test.ts
// ทดสอบเวลาปิดรับสมัคร (F5): ทัวร์พี่ไอซ์ปิดรับ 2026-10-03 00:00 +07:00 = 2026-10-02T17:00:00Z
// รัน: npx tsx --test tests/registration-window.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { isRegistrationClosed } from '@/lib/tournament/registrationWindow';

const CLOSES = '2026-10-03T00:00:00+07:00';

test('F5: ก่อนเวลาปิดรับ (23:59:59 คืนวันศุกร์) → ยังสมัครได้', () => {
  assert.equal(isRegistrationClosed(CLOSES, new Date('2026-10-02T23:59:59+07:00')), false);
});

test('F5: ถึงเวลาปิดพอดี (00:00 +07) → ปิดแล้ว', () => {
  assert.equal(isRegistrationClosed(CLOSES, new Date('2026-10-03T00:00:00+07:00')), true);
});

test('F5: หลังเวลาปิด → ปิดแล้ว', () => {
  assert.equal(isRegistrationClosed(CLOSES, new Date('2026-10-03T00:00:01+07:00')), true);
  assert.equal(isRegistrationClosed(CLOSES, new Date('2026-10-03T12:00:00+07:00')), true);
});

test('F5: เทียบแบบ absolute — เวลาเดียวกันต่างโซนให้ผลเหมือนกัน (UTC vs +07)', () => {
  assert.equal(isRegistrationClosed('2026-10-02T17:00:00Z', new Date('2026-10-03T00:00:00+07:00')), true);
  assert.equal(isRegistrationClosed('2026-10-02T17:00:00Z', new Date('2026-10-02T16:59:59Z')), false);
});

test('F5: ไม่มีเวลาปิด (null / undefined / ว่าง / ค่าที่อ่านไม่ได้) → ไม่จำกัด', () => {
  const now = new Date('2030-01-01T00:00:00Z');
  assert.equal(isRegistrationClosed(null, now), false);
  assert.equal(isRegistrationClosed(undefined, now), false);
  assert.equal(isRegistrationClosed('', now), false);
  assert.equal(isRegistrationClosed('not-a-date', now), false);
});
