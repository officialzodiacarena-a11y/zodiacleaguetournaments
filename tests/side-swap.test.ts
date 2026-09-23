// Run: npx tsx --test tests/side-swap.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSideSwapBoundary,
  nextSideSwapRound,
  getSideSwapType
} from '@/lib/valorant/side-swap';

test('Regulation: ก่อนถึงรอบ 12 ยังไม่สลับฝั่ง', () => {
  for (const r of [1, 2, 6, 11]) {
    assert.equal(isSideSwapBoundary(r), false);
    assert.equal(getSideSwapType(r), 'NONE');
  }
});

test('Regulation: รอบ 12 คือ Halftime — สลับฝั่งทางการครั้งที่ 1', () => {
  assert.equal(isSideSwapBoundary(12), true);
  assert.equal(getSideSwapType(12), 'HALFTIME');
});

test('Regulation: ระหว่างรอบ 13–23 (ครึ่งหลัง) ไม่มีจุดสลับฝั่งอัตโนมัติ', () => {
  for (const r of [13, 18, 23]) {
    assert.equal(isSideSwapBoundary(r), false);
    assert.equal(getSideSwapType(r), 'NONE');
  }
});

test('Overtime Entry: รอบ 24 (เสมอ 12–12) เป็นจุดเข้า OT และเลือกฝั่งเริ่มต้น OT', () => {
  assert.equal(isSideSwapBoundary(24), false);
  assert.equal(getSideSwapType(24), 'OT_NEW_SET_CHOICE');
});

test('Overtime Sets: สลับฝั่งหลังจบรอบแรกของทุกชุด OT (รอบ 25, 27, 29, 31, 33...)', () => {
  assert.equal(isSideSwapBoundary(25), true);
  assert.equal(getSideSwapType(25), 'OT_MID_SET_SWAP');

  assert.equal(isSideSwapBoundary(27), true);
  assert.equal(getSideSwapType(27), 'OT_MID_SET_SWAP');

  assert.equal(isSideSwapBoundary(29), true);
  assert.equal(getSideSwapType(29), 'OT_MID_SET_SWAP');

  assert.equal(isSideSwapBoundary(31), true);
  assert.equal(getSideSwapType(31), 'OT_MID_SET_SWAP');
});

test('Overtime Sets: จบชุด OT แต่ละชุด (รอบ 26, 28, 30, 32...) เป็นจุดเริ่มชุดใหม่', () => {
  assert.equal(isSideSwapBoundary(26), false);
  assert.equal(getSideSwapType(26), 'OT_NEW_SET_CHOICE');

  assert.equal(isSideSwapBoundary(28), false);
  assert.equal(getSideSwapType(28), 'OT_NEW_SET_CHOICE');

  assert.equal(isSideSwapBoundary(30), false);
  assert.equal(getSideSwapType(30), 'OT_NEW_SET_CHOICE');
});

test('nextSideSwapRound: คำนวณรอบถัดไปที่จะเกิดการสลับฝั่งอัตโนมัติถูกต้อง', () => {
  assert.equal(nextSideSwapRound(1), 12);
  assert.equal(nextSideSwapRound(12), 25);
  assert.equal(nextSideSwapRound(20), 25);
  assert.equal(nextSideSwapRound(24), 25);
  assert.equal(nextSideSwapRound(25), 27);
  assert.equal(nextSideSwapRound(26), 27);
});

test('Stress Test 1 ถึง 60 รอบ: ทำงานได้อย่างเสถียร 100% ปราศจากข้อผิดพลาด', () => {
  for (let r = 1; r <= 60; r++) {
    const type = getSideSwapType(r);
    const nextR = nextSideSwapRound(r);
    assert.ok(nextR > r || (r >= 12 && nextR >= r));
  }
});
