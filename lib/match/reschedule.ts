// lib/match/reschedule.ts
// ตรรกะล้วน (ไม่ใช้ DB) ของ "เลื่อนเวลานัด" สำหรับ PATCH /api/v1/matches/[id]/schedule
// ทดสอบด้วย: npx tsx --test tests/reschedule.test.ts
import { READY_WINDOW_MS } from '@/lib/match/ready-access';

export const RESCHEDULE_DELAY_OPTIONS: readonly number[] = [15, 30, 60];
export const RESCHEDULE_STATUSES: readonly string[] = ['SCHEDULED', 'READY_CHECK'];

export interface PlanRescheduleInput {
  status: string;
  scheduledAt: string | null | undefined;
  nowMs: number;
  delayMinutes: unknown;
}

export type PlanRescheduleResult =
  | { ok: true; scheduledAt: string; forfeitDeadlineAt: string | null }
  | { ok: false; code: string; message: string; httpStatus: number };

function fail(code: string, message: string, httpStatus: number): PlanRescheduleResult {
  return { ok: false, code, message, httpStatus };
}

export function planReschedule(input: PlanRescheduleInput): PlanRescheduleResult {
  const delay = typeof input.delayMinutes === 'number' ? input.delayMinutes : NaN;
  if (!RESCHEDULE_DELAY_OPTIONS.includes(delay)) {
    return fail('INVALID_DELAY', 'delay_minutes ต้องเป็น 15, 30 หรือ 60', 400);
  }
  if (!RESCHEDULE_STATUSES.includes(input.status)) {
    return fail('CANNOT_RESCHEDULE', 'เลื่อนเวลานัดได้เฉพาะแมตช์ที่ยังไม่เริ่ม (SCHEDULED / READY_CHECK)', 422);
  }

  const currentMs = input.scheduledAt ? new Date(input.scheduledAt).getTime() : NaN;
  const baseMs = Number.isNaN(currentMs) ? input.nowMs : Math.max(currentMs, input.nowMs);
  const nextMs = baseMs + delay * 60 * 1000;

  return {
    ok: true,
    scheduledAt: new Date(nextMs).toISOString(),
    forfeitDeadlineAt: input.status === 'READY_CHECK' ? new Date(nextMs + READY_WINDOW_MS).toISOString() : null,
  };
}

// HH:mm 24 ชั่วโมง เขตเวลา Asia/Bangkok — ใช้ในข้อความระบบของห้อง Lobby
export function formatBangkokClock(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}
