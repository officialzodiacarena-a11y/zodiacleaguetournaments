// tests/veto-view.test.ts
// ทดสอบตรรกะของหน้า Veto ของกัปตัน: ใครกดได้เมื่อไร สถานะของแต่ละแมพ และเวลานับถอยหลัง
// รัน: npx tsx --test tests/veto-view.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTileState, secondsRemaining, vetoViewerState } from '@/lib/veto/view';

test('กดได้เฉพาะตาของทีมตัวเองในสถานะ VETO', () => {
  const base = { matchStatus: 'VETO', complete: false, currentAction: 'BAN' as const };
  assert.equal(vetoViewerState({ ...base, currentTeam: 'A', viewerSide: 'A' }), 'MY_TURN');
  assert.equal(vetoViewerState({ ...base, currentTeam: 'A', viewerSide: 'B' }), 'OPPONENT_TURN');
  assert.equal(vetoViewerState({ ...base, currentTeam: 'B', viewerSide: 'B' }), 'MY_TURN');
});

test('ไม่ล็อกอิน / ไม่ใช่ผู้นำทีม = ดูอย่างเดียว ไม่ว่าตาใคร', () => {
  const base = { matchStatus: 'VETO', complete: false, currentAction: 'PICK' as const, viewerSide: null };
  assert.equal(vetoViewerState({ ...base, currentTeam: 'A' }), 'VIEW_ONLY');
  assert.equal(vetoViewerState({ ...base, currentTeam: 'B' }), 'VIEW_ONLY');
});

test('DECIDER ระบบเลือกเอง ผู้ใดก็กดไม่ได้', () => {
  const state = vetoViewerState({ matchStatus: 'VETO', complete: false, currentAction: 'DECIDER', currentTeam: null, viewerSide: 'A' });
  assert.equal(state, 'AUTOMATIC');
});

test('Veto ครบแล้ว หรือแมตช์ไม่ได้อยู่ใน VETO', () => {
  const base = { currentAction: null, currentTeam: null, viewerSide: 'A' as const };
  assert.equal(vetoViewerState({ ...base, matchStatus: 'LIVE', complete: true }), 'COMPLETE');
  assert.equal(vetoViewerState({ ...base, matchStatus: 'VETO', complete: true }), 'COMPLETE');
  assert.equal(vetoViewerState({ ...base, matchStatus: 'READY_CHECK', complete: false }), 'NOT_VETO');
  assert.equal(vetoViewerState({ ...base, matchStatus: 'SCHEDULED', complete: false }), 'NOT_VETO');
});

test('สถานะแมพ: ว่าง / แบน / เลือก / DECIDER (ไม่สนตัวพิมพ์) พร้อมธง auto', () => {
  const rows = [
    { step_order: 1, action: 'BAN', team_id: 'ta', map_name: 'Split', was_auto: false },
    { step_order: 2, action: 'BAN', team_id: 'tb', map_name: 'Abyss', was_auto: true },
    { step_order: 3, action: 'PICK', team_id: 'ta', map_name: 'Ascent', was_auto: false },
    { step_order: 5, action: 'DECIDER', team_id: null, map_name: 'Sunset', was_auto: true },
  ];
  assert.deepEqual(mapTileState('Bind', rows), { kind: 'AVAILABLE' });
  assert.deepEqual(mapTileState('split', rows), { kind: 'BANNED', step: 1, teamId: 'ta', auto: false });
  assert.deepEqual(mapTileState('Abyss', rows), { kind: 'BANNED', step: 2, teamId: 'tb', auto: true });
  assert.deepEqual(mapTileState('Ascent', rows), { kind: 'PICKED', step: 3, teamId: 'ta', auto: false });
  assert.deepEqual(mapTileState('Sunset', rows), { kind: 'DECIDER', step: 5, auto: true });
});

test('เวลานับถอยหลัง: นับต่อจากค่าเซิร์ฟเวอร์ ไม่ติดลบ และ null เมื่อไม่จับเวลา', () => {
  assert.equal(secondsRemaining(60, 1_000_000, 1_000_000), 60);
  assert.equal(secondsRemaining(60, 1_000_000, 1_000_000 + 12_400), 48);
  assert.equal(secondsRemaining(5, 1_000_000, 1_000_000 + 90_000), 0);
  assert.equal(secondsRemaining(60, 1_000_000, 900_000), 60); // นาฬิกาย้อน ไม่เกินค่าเดิม
  assert.equal(secondsRemaining(null, 1_000_000, 1_005_000), null);
});
