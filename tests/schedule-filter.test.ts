import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScheduleFilter, filterScheduleMatches, liveMapLabel, scheduleFilterHref } from '../lib/schedule/scheduleFilter';

const now = new Date('2026-10-09T05:00:00Z'); // 12:00 ไทย วันที่ 9
const ms = [
  { id: 'a', status: 'COMPLETED' as const, scheduledAt: '2026-10-09T07:00:00Z' },
  { id: 'b', status: 'LIVE' as const, scheduledAt: '2026-10-09T09:00:00Z' },
  { id: 'c', status: 'UPCOMING' as const, scheduledAt: '2026-10-09T11:00:00Z' },
  { id: 'd', status: 'COMPLETED' as const, scheduledAt: '2026-10-07T07:00:00Z' },
  { id: 'e', status: 'UPCOMING' as const, scheduledAt: '2026-10-12T07:00:00Z' },
  { id: 'f', status: 'UPCOMING' as const, scheduledAt: null },
];

test('parse: ค่าแปลก/ว่าง = all', () => {
  assert.equal(parseScheduleFilter(undefined), 'all');
  assert.equal(parseScheduleFilter('xx'), 'all');
  assert.equal(parseScheduleFilter(['live', 'past']), 'live');
  assert.equal(parseScheduleFilter('today'), 'today');
});

test('href', () => {
  assert.equal(scheduleFilterHref('all'), '/schedule');
  assert.equal(scheduleFilterHref('past'), '/schedule?f=past');
});

test('filter ทั้งหมด/live/วันนี้/ที่ผ่านมา', () => {
  assert.equal(filterScheduleMatches(ms, 'all', now).length, 6);
  assert.deepEqual(filterScheduleMatches(ms, 'live', now).map((m) => m.id), ['b']);
  assert.deepEqual(filterScheduleMatches(ms, 'today', now).map((m) => m.id), ['a', 'b', 'c']);
  assert.deepEqual(filterScheduleMatches(ms, 'past', now).map((m) => m.id), ['a', 'd']);
});

test('วันนี้ใช้เวลาไทย: 18:00 UTC วันที่ 8 = 01:00 ไทยวันที่ 9', () => {
  const r = filterScheduleMatches([{ status: 'UPCOMING' as const, scheduledAt: '2026-10-08T18:00:00Z' }], 'today', now);
  assert.equal(r.length, 1);
});

test('liveMapLabel', () => {
  assert.equal(liveMapLabel([], 3), undefined);
  assert.equal(
    liveMapLabel([{ game_number: 1, map_name: 'Ascent', status: 'COMPLETED' }, { game_number: 2, map_name: 'Haven', status: 'LIVE' }], 3),
    'Map 2/3 · Haven',
  );
  assert.equal(liveMapLabel([{ game_number: 1, map_name: 'Ascent', status: 'COMPLETED' }], 3), 'Map 1/3 · Ascent');
  assert.equal(liveMapLabel([{ game_number: 1, map_name: null, status: 'LIVE' }], 1), 'Map 1/1');
});
