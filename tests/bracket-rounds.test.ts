import test from 'node:test';
import assert from 'node:assert/strict';
import { groupBracketRounds, bracketHasLive } from '../lib/tournament/bracketRounds';

const n = (bracketType: string, roundNumber: number, positionInRound: number) => ({ bracketType, roundNumber, positionInRound });

test('single elim 8 ทีม: QF/SF/FINAL เรียงตามรอบ และตำแหน่ง', () => {
  const nodes = [n('UPPER', 2, 1), n('UPPER', 1, 2), n('UPPER', 1, 1), n('UPPER', 3, 1), n('UPPER', 1, 3), n('UPPER', 1, 4), n('UPPER', 2, 2)];
  const cols = groupBracketRounds(nodes);
  assert.deepEqual(cols.map((c) => c.label), ['QUARTER-FINALS', 'SEMI-FINALS', 'UPPER FINAL']);
  assert.deepEqual(cols[0].nodes.map((x) => x.positionInRound), [1, 2, 3, 4]);
});

test('double elim: upper → lower → grand final', () => {
  const cols = groupBracketRounds([n('GRAND_FINAL', 1, 1), n('LOWER', 1, 1), n('UPPER', 1, 1), n('UPPER', 2, 1)]);
  assert.deepEqual(cols.map((c) => c.label), ['SEMI-FINALS', 'UPPER FINAL', 'LOWER ROUND 1', 'GRAND FINAL']);
});

test('MAIN ใช้ชื่อ FINAL', () => {
  assert.deepEqual(groupBracketRounds([n('MAIN', 1, 1), n('MAIN', 2, 1)]).map((c) => c.label), ['SEMI-FINALS', 'FINAL']);
});

test('bracketHasLive', () => {
  assert.equal(bracketHasLive([{ status: 'PENDING' }, { status: 'LIVE' }]), true);
  assert.equal(bracketHasLive([{ status: 'COMPLETED' }]), false);
  assert.equal(bracketHasLive([]), false);
});
