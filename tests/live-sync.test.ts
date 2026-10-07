// tests/live-sync.test.ts
// ทดสอบตัวช่วยซิงก์สกอร์รอบและแถวเกมของจอถ่ายทอด
// รัน: npx tsx --test tests/live-sync.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectRoundWin, gamesFingerprint } from '@/lib/overlay/live-sync';

test('detectRoundWin: prev เป็น null → null', () => {
  assert.equal(detectRoundWin(null, { a: 1, b: 0 }), null);
});

test('detectRoundWin: 5-3 เป็น 6-3 → A', () => {
  assert.equal(detectRoundWin({ a: 5, b: 3 }, { a: 6, b: 3 }), 'A');
});

test('detectRoundWin: 5-3 เป็น 5-4 → B', () => {
  assert.equal(detectRoundWin({ a: 5, b: 3 }, { a: 5, b: 4 }), 'B');
});

test('detectRoundWin: 5-3 เป็น 6-4 (ขึ้นสองฝั่ง) → null', () => {
  assert.equal(detectRoundWin({ a: 5, b: 3 }, { a: 6, b: 4 }), null);
});

test('detectRoundWin: 5-3 เป็น 4-3 (แก้ลง) → null', () => {
  assert.equal(detectRoundWin({ a: 5, b: 3 }, { a: 4, b: 3 }), null);
});

test('detectRoundWin: 13-7 เป็น 0-0 (รีเซ็ต) → null', () => {
  assert.equal(detectRoundWin({ a: 13, b: 7 }, { a: 0, b: 0 }), null);
});

test('detectRoundWin: 5-3 เป็น 5-3 (เท่าเดิม) → null', () => {
  assert.equal(detectRoundWin({ a: 5, b: 3 }, { a: 5, b: 3 }), null);
});

const rows = [
  { id: 'g2', status: 'IN_PROGRESS', updated_at: '2026-10-07T10:00:00Z' },
  { id: 'g1', status: 'COMPLETED', updated_at: '2026-10-07T09:00:00Z' },
];

test('gamesFingerprint: null / undefined / รายการว่าง → ข้อความว่าง', () => {
  assert.equal(gamesFingerprint(null), '');
  assert.equal(gamesFingerprint(undefined), '');
  assert.equal(gamesFingerprint([]), '');
});

test('gamesFingerprint: สลับลำดับแถวได้ค่าเดิม', () => {
  assert.equal(gamesFingerprint(rows), gamesFingerprint([...rows].reverse()));
});

test('gamesFingerprint: status เปลี่ยน → ค่าเปลี่ยน', () => {
  const changed = rows.map((r) => (r.id === 'g2' ? { ...r, status: 'COMPLETED' } : r));
  assert.notEqual(gamesFingerprint(rows), gamesFingerprint(changed));
});

test('gamesFingerprint: updated_at เปลี่ยน → ค่าเปลี่ยน', () => {
  const changed = rows.map((r) => (r.id === 'g2' ? { ...r, updated_at: '2026-10-07T10:00:05Z' } : r));
  assert.notEqual(gamesFingerprint(rows), gamesFingerprint(changed));
});

test('gamesFingerprint: เพิ่มแถว → ค่าเปลี่ยน', () => {
  const more = [...rows, { id: 'g3', status: 'PENDING', updated_at: null }];
  assert.notEqual(gamesFingerprint(rows), gamesFingerprint(more));
});
