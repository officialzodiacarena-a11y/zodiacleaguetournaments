// lib/valorant/side-swap.ts
// คำนวณจุดสลับฝั่ง (Side Swap) และจุดเปลี่ยนชุดการแข่ง (OT Set Boundary) ของ VALORANT
//
// อ้างอิงกฎทางการของ Riot Games (VCT / Tournament Mode "Overtime: Win by Two"):
// 1. Regulation (รอบ 1–24):
//    - Halftime สลับฝั่งเมื่อจบ 12 รอบแรก (completedRounds = 12) เพื่อเริ่มรอบ 13
// 2. Overtime (รอบ 25 เป็นต้นไป):
//    - แข่งเป็นชุดละ 2 รอบ (2-Round Sets)
//    - completedRounds = 24 (เสมอ 12–12) -> เริ่ม OT (เลือกฝั่งเริ่มต้น OT)
//    - completedRounds = 25 (จบ OT 1.1) -> สลับฝั่งสำหรับรอบ 26 (OT 1.2)
//    - completedRounds = 26 (จบ OT 1.2) -> จบชุด OT 1 เริ่มชุด OT 2 (เลือกฝั่งใหม่)
//    - completedRounds = 27 (จบ OT 2.1) -> สลับฝั่งสำหรับรอบ 28 (OT 2.2)
//    - รูปแบบนี้ดำเนินต่อเนื่องแบบ Win by Two โดยไม่มี Sudden Death

export const REGULATION_ROUNDS_PER_HALF = 12;
export const REGULATION_TOTAL_ROUNDS = 24;
export const OVERTIME_SET_SIZE = 2;

export type SideSwapType = 'HALFTIME' | 'OT_MID_SET_SWAP' | 'OT_NEW_SET_CHOICE' | 'NONE';

export function getSideSwapType(completedRounds: number): SideSwapType {
  if (completedRounds === REGULATION_ROUNDS_PER_HALF) {
    return 'HALFTIME';
  }

  if (completedRounds < REGULATION_TOTAL_ROUNDS) {
    return 'NONE';
  }

  const otCompleted = completedRounds - REGULATION_TOTAL_ROUNDS;

  if (otCompleted === 0) {
    return 'OT_NEW_SET_CHOICE';
  }

  if (otCompleted % OVERTIME_SET_SIZE === 1) {
    return 'OT_MID_SET_SWAP';
  } else {
    return 'OT_NEW_SET_CHOICE';
  }
}

export function isSideSwapBoundary(completedRounds: number): boolean {
  const type = getSideSwapType(completedRounds);
  return type === 'HALFTIME' || type === 'OT_MID_SET_SWAP';
}

export function nextSideSwapRound(completedRounds: number): number {
  if (completedRounds < REGULATION_ROUNDS_PER_HALF) {
    return REGULATION_ROUNDS_PER_HALF;
  }

  if (completedRounds < REGULATION_TOTAL_ROUNDS) {
    return REGULATION_TOTAL_ROUNDS + 1;
  }

  const otCompleted = completedRounds - REGULATION_TOTAL_ROUNDS;

  if (otCompleted % OVERTIME_SET_SIZE === 0) {
    return completedRounds + 1;
  } else {
    return completedRounds + 2;
  }
}
