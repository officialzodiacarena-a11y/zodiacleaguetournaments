// Run: npx tsx --test tests/side-swap.test.ts
// จุดสลับฝั่ง VALORANT: Halftime ที่รอบ 12, OT สลับทุก 2 รอบตั้งแต่รอบ 24 (lib/valorant/side-swap.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import { isSideSwapBoundary, nextSideSwapRound } from '@/lib/valorant/side-swap';

test('ไม่ถึง Halftime ยังไม่สลับฝั่ง', () => {
  for (const r of [1, 5, 11]) assert.equal(isSideSwapBoundary(r), false);
});

test('รอบ 12 คือ Halftime — สลับฝั่งครั้งที่ 1', () => {
  assert.equal(isSideSwapBoundary(12), true);
});

test('ระหว่างรอบ 13-23 (regulation ครึ่งหลัง) ไม่มีจุดสลับเพิ่ม', () => {
  for (const r of [13, 18, 23]) assert.equal(isSideSwapBoundary(r), false);
});

test('รอบ 24 (เสมอ 12-12) คือจุดเริ่ม Overtime — นับเป็นจุดสลับฝั่งด้วย', () => {
  assert.equal(isSideSwapBoundary(24), true);
});

test('OT สลับฝั่งทุก 2 รอบ: 26, 28, 30 ใช่ / 25, 27, 29 ไม่ใช่', () => {
  assert.equal(isSideSwapBoundary(25), false);
  assert.equal(isSideSwapBoundary(26), true);
  assert.equal(isSideSwapBoundary(27), false);
  assert.equal(isSideSwapBoundary(28), true);
  assert.equal(isSideSwapBoundary(29), false);
  assert.equal(isSideSwapBoundary(30), true);
});

test('BO3 vs BO5 ไม่เกี่ยวกับจำนวนครั้งที่สลับฝั่งต่อแมพ — คำนวณจากรอบของแมพนั้นเดี่ยวๆ เท่านั้น', () => {
  // แมพที่จบแบบ 13-9 (ไม่เข้า OT) มีจุดสลับแค่ 1 ครั้งเสมอ ไม่ว่าจะเป็นแมพที่ 1 ของ BO3 หรือแมพที่ 4 ของ BO5
  const boundaries = Array.from({ length: 22 }, (_, i) => i + 1).filter((r) => isSideSwapBoundary(r));
  assert.deepEqual(boundaries, [12]);
});

test('nextSideSwapRound บอกรอบถัดไปที่ต้องรีเช็คตำแหน่ง', () => {
  assert.equal(nextSideSwapRound(1), 12);
  assert.equal(nextSideSwapRound(12), 24); // สลับที่ 12 ไปแล้ว จุดถัดไปคือ 24
  assert.equal(nextSideSwapRound(20), 24);
  assert.equal(nextSideSwapRound(24), 26);
  assert.equal(nextSideSwapRound(25), 26);
  assert.equal(nextSideSwapRound(26), 28);
});
