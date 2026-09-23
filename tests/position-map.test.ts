// Run: npx tsx --test tests/position-map.test.ts
// จับคู่ "หลอด HP ตำแหน่งนี้ = ใคร" จากชื่อที่อ่านได้ตอนกด Tab Scoreboard ครั้งเดียว (lib/ocr/position-map.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPositionMapFromTabNames, defaultPositionMap, tabIdToHpId, type PositionMapSlot } from '@/lib/ocr/position-map';

const roster: PositionMapSlot[] = [
  { id: 'a1', ign: 'Ming', team_id: 'A' },
  { id: 'a2', ign: 'scp20baht', team_id: 'A' },
  { id: 'b1', ign: 'MooDeng', team_id: 'B' },
  { id: 'b2', ign: 'Roxy', team_id: 'B' },
];

test('tabIdToHpId แปลง _tab_ เป็น _hp_ โดยไม่แตะส่วนอื่น', () => {
  assert.equal(tabIdToHpId('team_a_tab_3'), 'team_a_hp_3');
  assert.equal(tabIdToHpId('team_b_tab_0'), 'team_b_hp_0');
});

test('defaultPositionMap เดาตามลำดับที่ล็อกไว้ แยกตามทีม', () => {
  const map = defaultPositionMap(roster, 'A', 'B');
  assert.equal(map['team_a_hp_0'].ign, 'Ming');
  assert.equal(map['team_a_hp_1'].ign, 'scp20baht');
  assert.equal(map['team_b_hp_0'].ign, 'MooDeng');
  assert.equal(map['team_b_hp_1'].ign, 'Roxy');
});

test('buildPositionMapFromTabNames อัปเดตเฉพาะแถวที่จับคู่ชื่อได้', () => {
  const updates = buildPositionMapFromTabNames(
    {
      team_a_tab_0: { matched_player_id: 'a2' }, // sync ใหม่: ตำแหน่ง 0 จริงๆคือ scp20baht
      team_a_tab_1: { matched_player_id: null }, // อ่านไม่ออก — ไม่ควรมี key นี้ในผลลัพธ์
    },
    roster
  );
  assert.equal(updates['team_a_hp_0'].ign, 'scp20baht');
  assert.equal('team_a_hp_1' in updates, false);
});

test('buildPositionMapFromTabNames คืนค่าเปล่าถ้าจับคู่ไม่ได้เลย (ผู้เรียกต้อง merge ทับของเดิมเอง ไม่ล้าง mapping เก่า)', () => {
  const updates = buildPositionMapFromTabNames({ team_a_tab_0: { matched_player_id: null } }, roster);
  assert.deepEqual(updates, {});
});
