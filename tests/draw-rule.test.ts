// tests/draw-rule.test.ts
// กติกาเสมอได้ของทั้งแอป (lib/tournament/drawRule.ts): รูปแบบเก็บคะแนน · Bo2 · ตัดสินผลจากสกอร์แมพ
// รัน: npx tsx --test tests/draw-rule.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bestOfConfigAllowedForFormat,
  classifySeriesResult,
  isDrawAllowed,
  isPointsFormat,
} from '@/lib/tournament/drawRule';

test('isPointsFormat: 4 รูปแบบเก็บคะแนนเท่านั้น', () => {
  for (const f of ['ROUND_ROBIN', 'GROUP_STAGE', 'SWISS', 'ZODIAC_ARENA_SYSTEM']) assert.equal(isPointsFormat(f), true, f);
  for (const f of ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'GAUNTLET', 'SHOWDOWN', null, '']) {
    assert.equal(isPointsFormat(f), false, String(f));
  }
});

test('isDrawAllowed: เก็บคะแนน และ Bo = 2', () => {
  assert.equal(isDrawAllowed('ROUND_ROBIN', 2), true);
  assert.equal(isDrawAllowed('SWISS', 2), true);
  assert.equal(isDrawAllowed('ROUND_ROBIN', 3), false);
  assert.equal(isDrawAllowed('ROUND_ROBIN', 1), false);
  assert.equal(isDrawAllowed('SINGLE_ELIMINATION', 2), false);
});

test('bestOfConfigAllowedForFormat: ค่า 2 ใช้ได้เฉพาะสายเก็บคะแนน', () => {
  assert.equal(bestOfConfigAllowedForFormat('SINGLE_ELIMINATION', { default: 2 }), false);
  assert.equal(bestOfConfigAllowedForFormat('SINGLE_ELIMINATION', { default: 1, semifinal: 3, final: 3 }), true);
  assert.equal(bestOfConfigAllowedForFormat('GROUP_STAGE', { default: 2 }), true);
  assert.equal(bestOfConfigAllowedForFormat('DOUBLE_ELIMINATION', { default: 1, final: 2 }), false);
  assert.equal(bestOfConfigAllowedForFormat('SINGLE_ELIMINATION', null), true);
});

test('classifySeriesResult: ROUND_ROBIN Bo2 — รับเฉพาะ 2–0 · 0–2 · 1–1', () => {
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, 2, 0), 'A');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, 0, 2), 'B');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, 1, 1), 'DRAW');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, 1, 0), 'INVALID');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, 0, 1), 'INVALID');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, 0, 0), 'INVALID');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, 2, 1), 'INVALID');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, 1.5, 0), 'INVALID');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 2, -1, 0), 'INVALID');
});

test('classifySeriesResult: SINGLE_ELIMINATION ต้องมีผู้ชนะเสมอ', () => {
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 3, 2, 0), 'A');
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 3, 2, 1), 'A');
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 3, 1, 2), 'B');
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 3, 1, 1), 'INVALID');
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 3, 1, 0), 'INVALID');
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 1, 1, 0), 'A');
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 1, 0, 0), 'INVALID');
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 2, 1, 1), 'INVALID');
  assert.equal(classifySeriesResult('SINGLE_ELIMINATION', 2, 2, 0), 'A');
});

test('classifySeriesResult: ROUND_ROBIN Bo3 (เก็บคะแนนแต่ไม่ใช่ Bo2) ไม่เสมอ', () => {
  assert.equal(classifySeriesResult('ROUND_ROBIN', 3, 1, 1), 'INVALID');
  assert.equal(classifySeriesResult('ROUND_ROBIN', 3, 2, 1), 'A');
});
