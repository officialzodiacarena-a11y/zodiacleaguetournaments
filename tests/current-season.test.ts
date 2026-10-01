// Run: npx tsx --test tests/current-season.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBangkokQuarter,
  getSeasonCardState,
  getBangkokYear,
  getSeasonDisplayOrder,
  getSeasonStartLabel,
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

test('สถานะการ์ดครบทั้ง 4 ไตรมาส (ทุกการ์ด): ช่องก่อนหน้า = จบฤดูกาล · ปัจจุบัน = LIVE · ถัดไป = NEXT', () => {
  const kinds = (current: 1 | 2 | 3 | 4) =>
    ([1, 2, 3, 4] as const).map((card) => getSeasonCardState(card, current, false).kind);
  // [Spring, Summer, Fall, Winter]
  assert.deepEqual(kinds(1), ['live', 'next', 'locked', 'ended']); // ม.ค.: Winter ปีก่อนต้อง "จบฤดูกาล" ไม่ใช่ LOCKED
  assert.deepEqual(kinds(2), ['ended', 'live', 'next', 'locked']);
  assert.deepEqual(kinds(3), ['ended', 'ended', 'live', 'next']);
  assert.deepEqual(kinds(4), ['ended', 'ended', 'ended', 'live']);
});

test('ช่องก่อนหน้าในลำดับแสดงผลเป็น "จบฤดูกาล" เสมอ (ทุกไตรมาส)', () => {
  for (const q of [1, 2, 3, 4] as const) {
    const previous = getSeasonDisplayOrder(q)[0];
    assert.equal(getSeasonCardState(previous, q, true).badge, 'จบฤดูกาล');
  }
});

test('ม.ค.: Winter ช่องก่อนหน้า badge = จบฤดูกาล (บั๊กข้ามปี)', () => {
  assert.equal(getSeasonCardState(4, 1, false).badge, 'จบฤดูกาล');
});

test('ป้ายเดือน+ปีของฤดูกาลคำนวณจากวันที่ ไม่ตายตัว', () => {
  assert.equal(getSeasonStartLabel(3, 2, 2026), 'JULY 2026');
  assert.equal(getSeasonStartLabel(4, 3, 2026), 'OCTOBER 2026');
  // ม.ค. 2027: Winter ที่เพิ่งจบเริ่มเมื่อ ต.ค. 2026 · Fall ถัดไปเริ่ม ก.ค. 2027
  assert.equal(getSeasonStartLabel(4, 1, 2027), 'OCTOBER 2026');
  assert.equal(getSeasonStartLabel(3, 1, 2027), 'JULY 2027');
  assert.equal(getBangkokYear(new Date('2026-12-31T18:00:00Z')), 2027); // 1 ม.ค. 2027 เวลาไทย
});
