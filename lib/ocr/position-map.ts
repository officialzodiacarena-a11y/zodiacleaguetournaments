// lib/ocr/position-map.ts
// จับคู่ "ตำแหน่งหลอด HP บนจอ" (team_a_hp_i / team_b_hp_i) กับผู้เล่นจริง โดยอ่านชื่อจาก Tab Scoreboard
// ครั้งเดียวตอน Observer กด Tab ค้าง แล้วใช้ตำแหน่งเดิมตลอด Combat Phase (ตอนไม่มีชื่อให้อ่านแล้ว)
// เหตุผล: HUD ปกติของ VALORANT ไม่โชว์ชื่อผู้เล่นเลย (มีแค่รูป avatar) OCR อ่านชื่อได้แค่ตอนกด Tab
// (ดู lib/ocr/roi-regions.ts TAB_SCOREBOARD_NAME_ROI) จึงต้อง "จำตำแหน่ง" ไว้แทนการอ่านชื่อซ้ำทุกเฟรม
import type { LockedRosterCandidate } from './fuzzy-matcher';

export interface PositionMapSlot extends LockedRosterCandidate {
  team_id: string;
}

/** roi id ของ Tab Scoreboard (เช่น team_a_tab_2) -> roi id ของหลอด HP ตำแหน่งเดียวกัน (team_a_hp_2) */
export function tabIdToHpId(tabId: string): string {
  return tabId.replace('_tab_', '_hp_');
}

/**
 * สร้าง mapping "hp slot id -> ผู้เล่น" จากผลจับคู่ชื่อของ Tab Scoreboard (ครั้งล่าสุดที่ Observer กด Tab)
 * เฉพาะแถวที่จับคู่ชื่อได้ (มี matched_player_id) เท่านั้นที่จะอัปเดต — แถวที่อ่านไม่ออกคง mapping เดิมไว้
 * (เผื่อ Observer ยกนิ้วบัง/เฟรมเบลอตอนกด Tab บางคน ไม่ทำให้ทั้งชุด mapping หายไปด้วย)
 */
export function buildPositionMapFromTabNames(
  tabMatches: Record<string, { matched_player_id: string | null }>,
  lockedRoster: PositionMapSlot[]
): Record<string, PositionMapSlot> {
  const updates: Record<string, PositionMapSlot> = {};
  for (const [tabId, result] of Object.entries(tabMatches)) {
    if (!result.matched_player_id) continue;
    const found = lockedRoster.find((c) => c.id === result.matched_player_id);
    if (found) updates[tabIdToHpId(tabId)] = found;
  }
  return updates;
}

/** ค่าเริ่มต้นก่อนกด Tab ครั้งแรก — เดาตามลำดับที่ Observer ติ๊กล็อกรายชื่อไว้ (ดีกว่าไม่มี mapping เลย) */
export function defaultPositionMap(lockedRoster: PositionMapSlot[], teamAId: string, teamBId: string): Record<string, PositionMapSlot> {
  const map: Record<string, PositionMapSlot> = {};
  const teamA = lockedRoster.filter((c) => c.team_id === teamAId);
  const teamB = lockedRoster.filter((c) => c.team_id === teamBId);
  teamA.forEach((c, i) => {
    map[`team_a_hp_${i}`] = c;
  });
  teamB.forEach((c, i) => {
    map[`team_b_hp_${i}`] = c;
  });
  return map;
}
