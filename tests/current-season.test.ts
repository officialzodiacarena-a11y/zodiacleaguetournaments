// Run: npx tsx --test tests/current-season.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBangkokQuarter,
  getSeasonCardState,
  getSeasonDisplayOrder,
  getSeasonTickerText,
} from '@/lib/season/current-season';

test('ไตรมาสคำนวณจากเวลาไทย (Asia/Bangkok)', () => {
  assert.equal(getBangkokQuarter(new Date('2026-10-01T09:00:00+07:00')), 4);
  assert.equal(getBangkokQuarter(new Date('2026-03-31T23:59:00+07:00')), 1);
  // 30 ก.ย. 18:00 UTC = 1 ต.ค. 01:00 เวลาไทย → ไตรมาส 4
  assert.equal(getBangkokQuarter(new Date('2026-09-30T18:00:00Z')), 4);
  assert.equal(getBangkokQuarter(new Date('2026-06-30T12:00:00+07:00')), 2);
  assert.equal(getBangkokQuarter(new Date('2026-07-01T00:00:00+07:00')), 3);
});

test('ตุลาคม: Spring/Summer/Fall จบฤดูกาล · Winter LIVE', () => {
  assert.equal(getSeasonCardState(1, 4, true).kind, 'ended');
  assert.equal(getSeasonCardState(2, 4, true).badge, 'จบฤดูกาล');
  assert.equal(getSeasonCardState(3, 4, true).kind, 'ended');
  const winter = getSeasonCardState(4, 4, true);
  assert.equal(winter.badge, 'LIVE');
  assert.equal(winter.subline, 'เปิดรับสมัคร');
  assert.equal(getSeasonCardState(4, 4, false).subline, 'กำลังแข่ง');
});

test('ไตรมาสถัดไป = NEXT · ถัดจากนั้น = LOCKED', () => {
  assert.equal(getSeasonCardState(3, 2, false).badge, 'NEXT');
  assert.equal(getSeasonCardState(4, 2, false).badge, 'LOCKED');
});

test('ข้อความแถบวิ่งตามไตรมาส + ทัวร์เปิดรับ', () => {
  assert.equal(getSeasonTickerText(4, true), 'S4 WINTER · ZODIAC LEAGUE: เปิดรับสมัคร');
  assert.equal(getSeasonTickerText(4, false), 'S4 WINTER: กำลังแข่ง');
  assert.equal(getSeasonTickerText(2, false), 'S2 SUMMER: กำลังแข่ง');
});

test('ลำดับการ์ดฤดูกาล: ปัจจุบันอยู่ช่องที่ 2 ของ 4 (ช่องกลางเมื่อมี Zodiac League นำหน้า)', () => {
  // ต.ค. = Fall, Winter, Spring, Summer
  assert.deepEqual(getSeasonDisplayOrder(4), [3, 4, 1, 2]);
  // ม.ค. = Winter, Spring, Summer, Fall
  assert.deepEqual(getSeasonDisplayOrder(1), [4, 1, 2, 3]);
  for (const q of [1, 2, 3, 4] as const) {
    assert.equal(getSeasonDisplayOrder(q)[1], q);
    assert.equal(new Set(getSeasonDisplayOrder(q)).size, 4);
  }
});
