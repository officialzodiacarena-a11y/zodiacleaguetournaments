import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationStepStates, REGISTRATION_STEPS } from '../lib/tournament/registrationSteps';

test('มี 3 ขั้นตามดีไซน์ และขั้นสุดท้ายรวมการชำระ', () => {
  assert.equal(REGISTRATION_STEPS.length, 3);
  assert.deepEqual(REGISTRATION_STEPS.map((s) => s.id), ['team', 'roster', 'pay']);
});

test('ยังไม่สมัคร → อยู่ขั้น 2 (ตรวจ Roster) ขั้น 3 ล็อก', () => {
  assert.deepEqual(registrationStepStates(null), ['DONE', 'ACTIVE', 'LOCKED']);
  assert.deepEqual(registrationStepStates(undefined), ['DONE', 'ACTIVE', 'LOCKED']);
});

test('สมัครแล้วรอชำระ / ส่งสลิปแล้วรอตรวจ → อยู่ขั้น 3', () => {
  assert.deepEqual(registrationStepStates('AWAITING_PAYMENT'), ['DONE', 'DONE', 'ACTIVE']);
  assert.deepEqual(registrationStepStates('AWAITING_PAYMENT', 'AWAITING_PAYMENT'), ['DONE', 'DONE', 'ACTIVE']);
  assert.deepEqual(registrationStepStates('AWAITING_PAYMENT', 'SLIP_UPLOADED'), ['DONE', 'DONE', 'ACTIVE']);
});

test('ชำระอนุมัติแล้ว → ครบทุกขั้น', () => {
  assert.deepEqual(registrationStepStates('AWAITING_PAYMENT', 'APPROVED'), ['DONE', 'DONE', 'DONE']);
  assert.deepEqual(registrationStepStates('ELIGIBLE'), ['DONE', 'DONE', 'DONE']);
  assert.deepEqual(registrationStepStates('PENDING'), ['DONE', 'DONE', 'DONE']);
});

test('ถูกปฏิเสธ/ยกเลิก → ขั้นชำระล็อก ไม่ขึ้นว่าสำเร็จ', () => {
  assert.deepEqual(registrationStepStates('AWAITING_PAYMENT', 'REJECTED'), ['DONE', 'DONE', 'LOCKED']);
  assert.deepEqual(registrationStepStates('REJECTED'), ['DONE', 'DONE', 'LOCKED']);
  assert.deepEqual(registrationStepStates('CANCELLED'), ['DONE', 'DONE', 'LOCKED']);
});
