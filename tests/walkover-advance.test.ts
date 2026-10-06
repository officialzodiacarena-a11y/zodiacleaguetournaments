// tests/walkover-advance.test.ts
// ทดสอบการคัดแมตช์ปรับแพ้ที่ต้องเลื่อนสาย (ฟังก์ชันล้วน ไม่แตะ Supabase)
// รัน: npx tsx --test tests/walkover-advance.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickWalkoversToAdvance, type WalkoverMatchRow } from '@/lib/bracket/walkoverAdvance';

function match(overrides: Partial<WalkoverMatchRow> = {}): WalkoverMatchRow {
  return {
    id: 'm1',
    team_a_id: 'team-a',
    team_b_id: 'team-b',
    winner_team_id: 'team-a',
    bracket_node_id: 'n1',
    ...overrides,
  };
}

test('ผู้ชนะว่าง (ไม่มาทั้งสองทีม) → ไม่เอา', () => {
  const result = pickWalkoversToAdvance([match({ winner_team_id: null })], [{ id: 'n1', status: 'READY' }]);
  assert.deepEqual(result, []);
});

test('ไม่มี bracket_node_id (นอกสาย เช่น scrim) → ไม่เอา', () => {
  const result = pickWalkoversToAdvance([match({ bracket_node_id: null })], [{ id: 'n1', status: 'READY' }]);
  assert.deepEqual(result, []);
});

test('โหนดเป็น COMPLETED (เลื่อนสายแล้ว) → ไม่เอา', () => {
  const result = pickWalkoversToAdvance([match()], [{ id: 'n1', status: 'COMPLETED' }]);
  assert.deepEqual(result, []);
});

test('โหนดเป็นสถานะอื่น (READY / LIVE / PENDING) → เอา', () => {
  for (const status of ['READY', 'LIVE', 'PENDING']) {
    const result = pickWalkoversToAdvance([match()], [{ id: 'n1', status }]);
    assert.equal(result.length, 1, `status ${status}`);
    assert.equal(result[0].id, 'm1');
  }
});

test('โหนดหาไม่เจอในรายการ → ไม่เอา', () => {
  const result = pickWalkoversToAdvance([match()], [{ id: 'other-node', status: 'READY' }]);
  assert.deepEqual(result, []);
});

test('คัดหลายแมตช์: เอาเฉพาะที่ผ่านเงื่อนไข และรักษาลำดับเดิม', () => {
  const matches = [
    match({ id: 'm1', bracket_node_id: 'n1' }),
    match({ id: 'm2', bracket_node_id: 'n2' }),
    match({ id: 'm3', bracket_node_id: 'n3', winner_team_id: null }),
  ];
  const nodes = [
    { id: 'n1', status: 'READY' },
    { id: 'n2', status: 'COMPLETED' },
    { id: 'n3', status: 'READY' },
  ];
  assert.deepEqual(
    pickWalkoversToAdvance(matches, nodes).map((m) => m.id),
    ['m1']
  );
});
