// lib/match/timeouts.ts
// ตรรกะล้วน (ไม่ใช้ DB) ของ Time out ในแมตช์ — กติกา EWC 2026 ข้อ 5.6.1
//   Tactical: ทีมละ 2 ครั้งต่อแมพในช่วงปกติ · ช่วงต่อเวลา (สกอร์รอบทั้งสองทีม ≥ 12) ทีมละ 1 ครั้ง นับแยกจากช่วงปกติ · ครั้งละ 60 วินาที
//   Technical: ไม่จำกัด ไม่จับเวลา ต้องมีเหตุผล
// บันทึกทั้งหมดอยู่ใน match_state_transitions.state_snapshot (ไม่มีตารางใหม่)
// ทดสอบด้วย: npx tsx --test tests/timeouts.test.ts

export const TACTICAL_SECONDS = 60;
export const TACTICAL_PER_MAP = 2;
export const TACTICAL_PER_OVERTIME = 1;
export const OVERTIME_ROUND_THRESHOLD = 12;
export const TECHNICAL_REASON_MIN_LENGTH = 3;

export type TimeoutType = 'TACTICAL' | 'TECHNICAL';
export type TimeoutTeam = 'A' | 'B';

// แถวจาก match_state_transitions เท่าที่ตรรกะนี้ใช้
export interface TimeoutEvent {
  to_status: string;
  created_at: string;
  reason: string | null;
  state_snapshot: unknown;
}

export interface ActiveTimeout {
  type: TimeoutType;
  team: TimeoutTeam | null;
  reason: string | null;
  started_at: string;
  ends_at: string | null;
}

export interface TacticalUsed {
  A: number;
  B: number;
}

export function isOvertime(roundsA: number | null | undefined, roundsB: number | null | undefined): boolean {
  return (roundsA ?? 0) >= OVERTIME_ROUND_THRESHOLD && (roundsB ?? 0) >= OVERTIME_ROUND_THRESHOLD;
}

export function tacticalLimit(overtime: boolean): number {
  return overtime ? TACTICAL_PER_OVERTIME : TACTICAL_PER_MAP;
}

function snapshotOf(event: TimeoutEvent): Record<string, unknown> {
  return event.state_snapshot && typeof event.state_snapshot === 'object'
    ? (event.state_snapshot as Record<string, unknown>)
    : {};
}

export function countTacticalUsed(
  events: readonly TimeoutEvent[],
  scope: { gameNumber: number; overtime: boolean },
): TacticalUsed {
  const used: TacticalUsed = { A: 0, B: 0 };
  for (const event of events) {
    const snap = snapshotOf(event);
    if (snap.event !== 'TIMEOUT' || snap.pause_type !== 'TACTICAL') continue;
    if (snap.game_number !== scope.gameNumber) continue;
    if (Boolean(snap.overtime) !== scope.overtime) continue;
    if (snap.team === 'A') used.A += 1;
    else if (snap.team === 'B') used.B += 1;
  }
  return used;
}

export interface DecideTimeoutInput {
  status: string;
  type: TimeoutType;
  team: TimeoutTeam | null | undefined;
  reason: string | null | undefined;
  used: TacticalUsed;
  overtime: boolean;
}

export type DecideTimeoutResult =
  | { ok: true; type: TimeoutType; team: TimeoutTeam | null; reason: string | null; durationSeconds: number | null }
  | { ok: false; code: string; message: string; httpStatus: number };

function fail(code: string, message: string, httpStatus: number): DecideTimeoutResult {
  return { ok: false, code, message, httpStatus };
}

export function decideTimeout(input: DecideTimeoutInput): DecideTimeoutResult {
  if (input.status !== 'LIVE') {
    return fail('MATCH_NOT_LIVE', 'ขอ Time out ได้เฉพาะตอนแมตช์สถานะ LIVE', 422);
  }

  const reason = input.reason?.trim() ?? '';

  if (input.type === 'TACTICAL') {
    if (input.team !== 'A' && input.team !== 'B') {
      return fail('TEAM_REQUIRED', 'Tactical Timeout ต้องระบุทีม (A หรือ B)', 400);
    }
    const limit = tacticalLimit(input.overtime);
    if (input.used[input.team] >= limit) {
      return fail(
        'TIMEOUT_LIMIT_REACHED',
        `ทีม ${input.team} ใช้ Tactical Timeout ครบ ${limit} ครั้งแล้ว${input.overtime ? ' (ช่วงต่อเวลา)' : ' (แมพนี้)'}`,
        422,
      );
    }
    return { ok: true, type: 'TACTICAL', team: input.team, reason: reason || null, durationSeconds: TACTICAL_SECONDS };
  }

  if (reason.length < TECHNICAL_REASON_MIN_LENGTH) {
    return fail('REASON_REQUIRED', 'Technical Pause ต้องระบุเหตุผล (อย่างน้อย 3 ตัวอักษร)', 400);
  }
  return { ok: true, type: 'TECHNICAL', team: input.team === 'A' || input.team === 'B' ? input.team : null, reason, durationSeconds: null };
}

// รายการหยุดที่กำลังเกิดอยู่: มีเฉพาะตอนสถานะ PAUSED และการเปลี่ยนเป็น PAUSED ล่าสุดมาจาก Time out
// (PAUSED ที่มาจากทางอื่น = ไม่มีรายการ → ผู้เรียกถือเป็น Technical Pause แบบเดิม)
export function activeTimeout(status: string, events: readonly TimeoutEvent[]): ActiveTimeout | null {
  if (status !== 'PAUSED') return null;

  let latest: TimeoutEvent | null = null;
  for (const event of events) {
    if (event.to_status !== 'PAUSED') continue;
    if (!latest || new Date(event.created_at).getTime() >= new Date(latest.created_at).getTime()) latest = event;
  }
  if (!latest) return null;

  const snap = snapshotOf(latest);
  if (snap.event !== 'TIMEOUT') return null;
  const type = snap.pause_type === 'TACTICAL' ? 'TACTICAL' : 'TECHNICAL';
  const team = snap.team === 'A' || snap.team === 'B' ? snap.team : null;

  return {
    type,
    team,
    reason: latest.reason,
    started_at: typeof snap.started_at === 'string' ? snap.started_at : latest.created_at,
    ends_at: typeof snap.ends_at === 'string' ? snap.ends_at : null,
  };
}
