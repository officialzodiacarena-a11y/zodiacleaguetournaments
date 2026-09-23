// lib/valorant/side-swap.ts
// คำนวณว่ารอบที่เพิ่งจบไปเป็น "จุดสลับฝั่ง" (Attacker/Defender) ของ VALORANT หรือไม่ — ใช้กฎมาตรฐาน
// ของเกม ไม่ต้องอ่าน/เดาจากภาพเลย เพราะระบบเรารู้เลขรอบที่เล่นไปแล้วของแมพนั้นอยู่แล้ว (rounds_won_a +
// rounds_won_b) เอาไว้เป็นจุดกระตุ้น "รีเช็คตำแหน่ง" ให้ระบบใดก็ตามที่ต้องรู้ว่าใครอยู่ฝั่งไหน (เช่น ถ้า
// กลับมาทำระบบอ่านตำแหน่งบนจอในอนาคต) แทนที่จะรีเช็คทุกรอบหรือเดาว่าสลับหรือยัง
//
// กฎ (regulation): 12 รอบต่อฝั่ง ครบ 12 รอบสลับฝั่งครั้งที่ 1 (Halftime)
// กฎ (overtime): ถ้าเสมอ 12-12 (ครบ 24 รอบ) เข้า OT เล่นเป็นชุดละ 2 รอบ สลับฝั่งทุกครั้งที่ครบชุด
// (รอบ 24 เริ่ม OT + เลือกฝั่งใหม่, 26, 28, 30, ... ) — Sudden Death (ถ้า OT ยืดถึง 3 เซ็ตไม่จบ) ยังไม่รองรับ
// ในฟังก์ชันนี้ เพราะกฎการเลือกฝั่งตอนนั้นไม่ตรงกับ pattern ทุก-2-รอบปกติ (กลับไปใช้ฝั่งเริ่ม OT แทน) —
// ถือเป็น edge case หายากที่ยังไม่ได้ยืนยันจากเอกสารทางการของ Riot ตรง ๆ (อ้างอิงจากผลค้นหาเว็บเท่านั้น)
export const REGULATION_ROUNDS_PER_HALF = 12;
export const OVERTIME_ROUND_SET_SIZE = 2;

/**
 * รอบที่ "เพิ่งจบไป" (completedRounds = rounds_won_a + rounds_won_b หลังจบรอบนั้น) เป็นจุดสลับฝั่งไหม
 * true = ก่อนเริ่มรอบถัดไป ทีม/ตำแหน่งจะสลับฝั่ง ระบบที่พึ่งพาตำแหน่งควรรีเช็ค ณ จุดนี้
 */
export function isSideSwapBoundary(completedRounds: number): boolean {
  if (completedRounds === REGULATION_ROUNDS_PER_HALF) return true; // Halftime
  const regulationTotal = REGULATION_ROUNDS_PER_HALF * 2; // 24
  if (completedRounds < regulationTotal) return false; // ยังอยู่ใน regulation ไม่มีจุดสลับเพิ่ม
  const otRoundsCompleted = completedRounds - regulationTotal;
  return otRoundsCompleted % OVERTIME_ROUND_SET_SIZE === 0; // รวมรอบ 24 (เริ่ม OT) ด้วย
}

/** เลขรอบถัดไปที่จะเป็นจุดสลับฝั่ง นับจากรอบที่เล่นไปแล้วตอนนี้ — เอาไว้โชว์ "อีกกี่รอบต้องรีเช็ค" ในหน้า UI */
export function nextSideSwapRound(completedRounds: number): number {
  if (completedRounds < REGULATION_ROUNDS_PER_HALF) return REGULATION_ROUNDS_PER_HALF;
  const regulationTotal = REGULATION_ROUNDS_PER_HALF * 2;
  if (completedRounds < regulationTotal) return regulationTotal;
  const otRoundsCompleted = completedRounds - regulationTotal;
  const roundsIntoCurrentSet = otRoundsCompleted % OVERTIME_ROUND_SET_SIZE;
  const roundsUntilNext = roundsIntoCurrentSet === 0 ? OVERTIME_ROUND_SET_SIZE : OVERTIME_ROUND_SET_SIZE - roundsIntoCurrentSet;
  return completedRounds + roundsUntilNext;
}
