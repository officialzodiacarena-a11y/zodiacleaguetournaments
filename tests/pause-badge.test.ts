// tests/pause-badge.test.ts
// ทดสอบข้อความป้ายหยุดบนจอถ่ายทอด (S3)
// รัน: npx tsx --test tests/pause-badge.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePauseBadge, type OverlayTimeout } from '@/lib/overlay/pause-badge';

const NOW = Date.parse('2026-10-06T10:00:00.000Z');

function tacticalInfo(team: 'A' | 'B', leftSeconds: number): OverlayTimeout {
  return {
    type: 'TACTICAL',
    team,
    reason: null,
    started_at: '2026-10-06T09:59:00.000Z',
    ends_at: new Date(NOW + leftSeconds * 1000).toISOString(),
  };
}

const technicalInfo: OverlayTimeout = {
  type: 'TECHNICAL',
  team: null,
  reason: 'เน็ตหลุด',
  started_at: '2026-10-06T09:59:00.000Z',
  ends_at: null,
};

const base = { nowMs: NOW, teamAName: 'ALPHA', teamBName: 'BRAVO' };

test('สถานะ LIVE + มีข้อมูล Tactical ค้าง → null', () => {
  assert.equal(resolvePauseBadge({ ...base, status: 'LIVE', loaded: true, info: tacticalInfo('B', 42) }), null);
});

test('PAUSED + loaded false → null (ยังไม่ได้คำตอบ ห้ามขึ้น TECHNICAL PAUSE)', () => {
  assert.equal(resolvePauseBadge({ ...base, status: 'PAUSED', loaded: false, info: null }), null);
});

test('Tactical เหลือ 42 วินาที ทีม B → มีชื่อทีม B และ 42', () => {
  const text = resolvePauseBadge({ ...base, status: 'PAUSED', loaded: true, info: tacticalInfo('B', 42) });
  assert.ok(text?.includes('BRAVO'));
  assert.ok(text?.includes('42'));
  assert.equal(text, 'TACTICAL TIMEOUT · BRAVO · 42');
});

test('Tactical เหลือ 5 วินาที → 05', () => {
  const text = resolvePauseBadge({ ...base, status: 'PAUSED', loaded: true, info: tacticalInfo('A', 5) });
  assert.equal(text, 'TACTICAL TIMEOUT · ALPHA · 05');
});

test('Tactical ครบเวลา (0 และติดลบ) → null', () => {
  assert.equal(resolvePauseBadge({ ...base, status: 'PAUSED', loaded: true, info: tacticalInfo('A', 0) }), null);
  assert.equal(resolvePauseBadge({ ...base, status: 'PAUSED', loaded: true, info: tacticalInfo('A', -3) }), null);
});

test('Technical → TECHNICAL PAUSE', () => {
  assert.equal(resolvePauseBadge({ ...base, status: 'PAUSED', loaded: true, info: technicalInfo }), 'TECHNICAL PAUSE');
});

test('PAUSED + loaded true + ไม่มีข้อมูล → TECHNICAL PAUSE', () => {
  assert.equal(resolvePauseBadge({ ...base, status: 'PAUSED', loaded: true, info: null }), 'TECHNICAL PAUSE');
});

test('ไม่มีชื่อทีม → ใช้ A / B', () => {
  const a = resolvePauseBadge({ nowMs: NOW, status: 'PAUSED', loaded: true, info: tacticalInfo('A', 30) });
  const b = resolvePauseBadge({ nowMs: NOW, status: 'PAUSED', loaded: true, info: tacticalInfo('B', 30) });
  assert.equal(a, 'TACTICAL TIMEOUT · A · 30');
  assert.equal(b, 'TACTICAL TIMEOUT · B · 30');
});

test('นาฬิกาเก่ากว่าเวลาเริ่มหยุด → เลขนับถอยหลังไม่เกินความยาวจริง (60)', () => {
  const info: OverlayTimeout = {
    type: 'TACTICAL',
    team: 'A',
    reason: null,
    started_at: '2026-10-06T10:00:00.000Z',
    ends_at: '2026-10-06T10:01:00.000Z',
  };
  const early = Date.parse('2026-10-06T09:30:00.000Z');
  assert.equal(
    resolvePauseBadge({ nowMs: early, teamAName: 'ALPHA', status: 'PAUSED', loaded: true, info }),
    'TACTICAL TIMEOUT · ALPHA · 60',
  );
});

test('นาฬิกาหลังเวลาเริ่มหยุด 1 วินาที → 59', () => {
  const info: OverlayTimeout = {
    type: 'TACTICAL',
    team: 'A',
    reason: null,
    started_at: '2026-10-06T10:00:00.000Z',
    ends_at: '2026-10-06T10:01:00.000Z',
  };
  const text = resolvePauseBadge({ nowMs: Date.parse('2026-10-06T10:00:01.000Z'), teamAName: 'ALPHA', status: 'PAUSED', loaded: true, info });
  assert.ok(text?.endsWith('59'));
});
