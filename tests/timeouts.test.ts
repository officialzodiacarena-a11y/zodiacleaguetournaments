// tests/timeouts.test.ts
// ทดสอบตรรกะ Time out (ส่วน C1)
// รัน: npx tsx --test tests/timeouts.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeTimeout,
  countTacticalUsed,
  decideTimeout,
  isOvertime,
  type TimeoutEvent,
  type TimeoutTeam,
} from '@/lib/match/timeouts';

function tactical(team: TimeoutTeam, gameNumber: number, overtime = false, createdAt = '2026-10-06T10:00:00.000Z'): TimeoutEvent {
  return {
    to_status: 'PAUSED',
    created_at: createdAt,
    reason: null,
    state_snapshot: { event: 'TIMEOUT', pause_type: 'TACTICAL', team, game_number: gameNumber, overtime },
  };
}

function decide(team: TimeoutTeam, events: TimeoutEvent[], gameNumber: number, overtime: boolean) {
  return decideTimeout({
    status: 'LIVE',
    type: 'TACTICAL',
    team,
    reason: null,
    used: countTacticalUsed(events, { gameNumber, overtime }),
    overtime,
  });
}

test('Tactical ครั้งที่ 1–2 ผ่าน ครั้งที่ 3 ปฏิเสธ', () => {
  assert.equal(decide('A', [], 1, false).ok, true);
  assert.equal(decide('A', [tactical('A', 1)], 1, false).ok, true);
  const third = decide('A', [tactical('A', 1), tactical('A', 1)], 1, false);
  assert.equal(third.ok, false);
  if (!third.ok) {
    assert.equal(third.code, 'TIMEOUT_LIMIT_REACHED');
    assert.equal(third.httpStatus, 422);
  }
});

test('แมพใหม่โควตาเริ่มใหม่', () => {
  const events = [tactical('A', 1), tactical('A', 1)];
  assert.equal(decide('A', events, 2, false).ok, true);
});

test('ต่อเวลาได้ 1 ครั้งแม้ช่วงปกติใช้ครบ และครั้งที่ 2 ในต่อเวลาปฏิเสธ', () => {
  const normalFull = [tactical('A', 3), tactical('A', 3)];
  assert.equal(decide('A', normalFull, 3, true).ok, true);
  const afterOne = [...normalFull, tactical('A', 3, true)];
  const second = decide('A', afterOne, 3, true);
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.code, 'TIMEOUT_LIMIT_REACHED');
});

test('โควตาทีม A ไม่กระทบทีม B', () => {
  const events = [tactical('A', 1), tactical('A', 1)];
  assert.equal(decide('B', events, 1, false).ok, true);
  assert.deepEqual(countTacticalUsed(events, { gameNumber: 1, overtime: false }), { A: 2, B: 0 });
});

test('Technical ไม่มีเหตุผลปฏิเสธ (REASON_REQUIRED 400) · มีเหตุผลผ่านและไม่จับเวลา', () => {
  const none = decideTimeout({ status: 'LIVE', type: 'TECHNICAL', team: null, reason: ' ab ', used: { A: 0, B: 0 }, overtime: false });
  assert.equal(none.ok, false);
  if (!none.ok) {
    assert.equal(none.code, 'REASON_REQUIRED');
    assert.equal(none.httpStatus, 400);
  }
  const ok = decideTimeout({ status: 'LIVE', type: 'TECHNICAL', team: null, reason: 'เน็ตหลุด', used: { A: 0, B: 0 }, overtime: false });
  assert.equal(ok.ok && ok.durationSeconds, null);
});

test('Tactical ไม่ระบุทีม → TEAM_REQUIRED 400', () => {
  const result = decideTimeout({ status: 'LIVE', type: 'TACTICAL', team: null, reason: null, used: { A: 0, B: 0 }, overtime: false });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'TEAM_REQUIRED');
});

test('สถานะไม่ใช่ LIVE ปฏิเสธ MATCH_NOT_LIVE 422', () => {
  for (const status of ['PAUSED', 'SCHEDULED', 'AWAITING_RESULT']) {
    const result = decideTimeout({ status, type: 'TACTICAL', team: 'A', reason: null, used: { A: 0, B: 0 }, overtime: false });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'MATCH_NOT_LIVE');
      assert.equal(result.httpStatus, 422);
    }
  }
});

test('isOvertime: ทั้งสองทีม ≥ 12 เท่านั้น', () => {
  assert.equal(isOvertime(12, 12), true);
  assert.equal(isOvertime(13, 11), false);
  assert.equal(isOvertime(null, 12), false);
});

test('activeTimeout คืน null เมื่อสถานะไม่ใช่ PAUSED', () => {
  assert.equal(activeTimeout('LIVE', [tactical('A', 1)]), null);
  assert.equal(activeTimeout('SCHEDULED', []), null);
});

test('activeTimeout: PAUSED จาก Time out ล่าสุดคืนรายการ · PAUSED จากทางอื่นคืน null', () => {
  const events: TimeoutEvent[] = [
    tactical('A', 1, false, '2026-10-06T10:00:00.000Z'),
    {
      to_status: 'PAUSED',
      created_at: '2026-10-06T10:10:00.000Z',
      reason: null,
      state_snapshot: {
        event: 'TIMEOUT', pause_type: 'TACTICAL', team: 'B', game_number: 1, overtime: false,
        started_at: '2026-10-06T10:10:00.000Z', ends_at: '2026-10-06T10:11:00.000Z',
      },
    },
  ];
  const active = activeTimeout('PAUSED', events);
  assert.equal(active?.type, 'TACTICAL');
  assert.equal(active?.team, 'B');
  assert.equal(active?.ends_at, '2026-10-06T10:11:00.000Z');

  const legacy: TimeoutEvent[] = [
    ...events,
    { to_status: 'PAUSED', created_at: '2026-10-06T10:20:00.000Z', reason: 'x', state_snapshot: { updated_at: 'x' } },
  ];
  assert.equal(activeTimeout('PAUSED', legacy), null);
});
