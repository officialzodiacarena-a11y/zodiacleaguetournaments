// tests/reschedule.test.ts
// ทดสอบ planReschedule (ส่วน B: เลื่อนเวลานัด)
// รัน: npx tsx --test tests/reschedule.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBangkokClock, planReschedule } from '@/lib/match/reschedule';
import { READY_WINDOW_MS } from '@/lib/match/ready-access';

const NOW = Date.parse('2026-10-06T10:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();

test('ค่านาที 15 / 30 / 60 ผ่าน', () => {
  for (const delay of [15, 30, 60]) {
    const result = planReschedule({ status: 'SCHEDULED', scheduledAt: iso(NOW + 3600_000), nowMs: NOW, delayMinutes: delay });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.scheduledAt, iso(NOW + 3600_000 + delay * 60_000));
  }
});

test('ค่านาทีอื่น → INVALID_DELAY 400', () => {
  for (const delay of [0, 10, 45, '15', null, undefined]) {
    const result = planReschedule({ status: 'SCHEDULED', scheduledAt: iso(NOW), nowMs: NOW, delayMinutes: delay });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'INVALID_DELAY');
      assert.equal(result.httpStatus, 400);
    }
  }
});

test('เวลานัดเดิมอนาคต: นับต่อจากเวลานัดเดิม', () => {
  const result = planReschedule({ status: 'SCHEDULED', scheduledAt: iso(NOW + 7200_000), nowMs: NOW, delayMinutes: 30 });
  assert.equal(result.ok && result.scheduledAt, iso(NOW + 7200_000 + 30 * 60_000));
});

test('เวลานัดเดิมผ่านแล้ว: นับจากตอนนี้', () => {
  const result = planReschedule({ status: 'SCHEDULED', scheduledAt: iso(NOW - 3600_000), nowMs: NOW, delayMinutes: 15 });
  assert.equal(result.ok && result.scheduledAt, iso(NOW + 15 * 60_000));
});

test('เวลานัดเดิมว่าง: นับจากตอนนี้', () => {
  const result = planReschedule({ status: 'SCHEDULED', scheduledAt: null, nowMs: NOW, delayMinutes: 60 });
  assert.equal(result.ok && result.scheduledAt, iso(NOW + 60 * 60_000));
});

test('READY_CHECK: ได้เส้นตายใหม่ = เวลานัดใหม่ + 15 นาที', () => {
  const result = planReschedule({ status: 'READY_CHECK', scheduledAt: iso(NOW - 600_000), nowMs: NOW, delayMinutes: 30 });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.scheduledAt, iso(NOW + 30 * 60_000));
    assert.equal(result.forfeitDeadlineAt, iso(NOW + 30 * 60_000 + READY_WINDOW_MS));
  }
});

test('SCHEDULED: เส้นตายเป็น null', () => {
  const result = planReschedule({ status: 'SCHEDULED', scheduledAt: iso(NOW), nowMs: NOW, delayMinutes: 15 });
  assert.equal(result.ok && result.forfeitDeadlineAt, null);
});

test('VETO / WALKOVER (และสถานะอื่น) ปฏิเสธ CANNOT_RESCHEDULE 422', () => {
  for (const status of ['VETO', 'WALKOVER', 'LIVE', 'COMPLETED']) {
    const result = planReschedule({ status, scheduledAt: iso(NOW), nowMs: NOW, delayMinutes: 15 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'CANNOT_RESCHEDULE');
      assert.equal(result.httpStatus, 422);
    }
  }
});

test('formatBangkokClock: UTC+7 แบบ 24 ชั่วโมง', () => {
  assert.equal(formatBangkokClock('2026-10-06T10:05:00.000Z'), '17:05');
  assert.equal(formatBangkokClock(null), '--:--');
});
