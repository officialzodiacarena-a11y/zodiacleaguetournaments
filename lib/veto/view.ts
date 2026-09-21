// lib/veto/view.ts
// ตรรกะล้วนของหน้า Veto ของกัปตัน (app/matches/[id]/veto): ตอนนี้ผู้เปิดดูทำอะไรได้ และแต่ละแมพอยู่สถานะไหน
// ทดสอบด้วย: npx tsx --test tests/veto-view.test.ts
import { sameMap, type TeamSide, type VetoActionKind } from '@/lib/veto/engine';

export type VetoViewerState =
  | 'NOT_VETO' // แมตช์ยังไม่ถึง / เลยช่วง Veto ไปแล้ว
  | 'COMPLETE' // ครบทุกสเต็ปแล้ว
  | 'AUTOMATIC' // สเต็ปปัจจุบันเป็น DECIDER ระบบเลือกเอง
  | 'MY_TURN' // ตาของทีมผู้ดู กด Ban / Pick ได้
  | 'OPPONENT_TURN' // ตาของอีกทีม
  | 'VIEW_ONLY'; // ไม่ล็อกอิน หรือไม่ใช่ผู้นำทีมในแมตช์นี้

export interface VetoViewerInput {
  matchStatus: string;
  complete: boolean;
  currentAction: VetoActionKind | null;
  currentTeam: TeamSide | null;
  viewerSide: TeamSide | null;
}

export function vetoViewerState(input: VetoViewerInput): VetoViewerState {
  if (input.matchStatus !== 'VETO') return input.complete ? 'COMPLETE' : 'NOT_VETO';
  if (input.complete) return 'COMPLETE';
  if (input.currentAction === 'DECIDER') return 'AUTOMATIC';
  if (!input.viewerSide) return 'VIEW_ONLY';
  return input.currentTeam === input.viewerSide ? 'MY_TURN' : 'OPPONENT_TURN';
}

export type MapTileState =
  | { kind: 'AVAILABLE' }
  | { kind: 'BANNED'; step: number; teamId: string | null; auto: boolean }
  | { kind: 'PICKED'; step: number; teamId: string | null; auto: boolean }
  | { kind: 'DECIDER'; step: number; auto: boolean };

export interface VetoRowView {
  step_order: number;
  action: string;
  team_id: string | null;
  map_name: string;
  was_auto?: boolean;
}

export function mapTileState(map: string, rows: VetoRowView[]): MapTileState {
  const row = rows.find((r) => sameMap(r.map_name, map));
  if (!row) return { kind: 'AVAILABLE' };
  const auto = Boolean(row.was_auto);
  if (row.action === 'BAN') return { kind: 'BANNED', step: row.step_order, teamId: row.team_id, auto };
  if (row.action === 'PICK') return { kind: 'PICKED', step: row.step_order, teamId: row.team_id, auto };
  return { kind: 'DECIDER', step: row.step_order, auto };
}

// วินาทีที่เหลือ: ใช้ seconds_left จากเซิร์ฟเวอร์ตอนดึงข้อมูล แล้วนับต่อด้วยเวลาที่ผ่านไปบนเครื่องผู้ดู
// (ไม่เทียบนาฬิกาเครื่องกับ deadline โดยตรง เพราะนาฬิกาเครื่องผู้ใช้อาจเพี้ยนจากเซิร์ฟเวอร์)
export function secondsRemaining(secondsLeftAtFetch: number | null, fetchedAtMs: number, nowMs: number): number | null {
  if (secondsLeftAtFetch === null) return null;
  const elapsed = Math.max(0, Math.floor((nowMs - fetchedAtMs) / 1000));
  return Math.max(0, secondsLeftAtFetch - elapsed);
}
