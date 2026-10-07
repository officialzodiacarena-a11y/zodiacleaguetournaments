// lib/tournament/drawRule.ts
// กติกา "เสมอได้ไหม" ของทั้งแอป — ที่เดียว (ฟังก์ชันล้วน ไม่แตะ React ฐานข้อมูล และเครือข่าย)
// แมตช์เสมอได้ = สายเป็นรูปแบบเก็บคะแนน และ Bo ของแมตช์ = 2 (แมพเดียวเสมอไม่ได้ ทุกแมพต้องมีผู้ชนะ)

export const POINTS_FORMATS: readonly string[] = ['ROUND_ROBIN', 'GROUP_STAGE', 'SWISS', 'ZODIAC_ARENA_SYSTEM'];

export type SeriesClassification = 'A' | 'B' | 'DRAW' | 'INVALID';

export function isPointsFormat(format: unknown): boolean {
  return typeof format === 'string' && POINTS_FORMATS.includes(format);
}

export function isDrawAllowed(format: unknown, bestOf: unknown): boolean {
  return isPointsFormat(format) && bestOf === 2;
}

// best_of_config ที่มีค่า 2 อยู่ → ใช้ได้เฉพาะรูปแบบเก็บคะแนน · config ที่ไม่ใช่ object หรือไม่มีค่า 2 → ผ่านเสมอ
export function bestOfConfigAllowedForFormat(format: unknown, config: unknown): boolean {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return true;
  const hasBo2 = Object.values(config as Record<string, unknown>).some((v) => v === 2);
  return hasBo2 ? isPointsFormat(format) : true;
}

export function classifySeriesResult(
  format: unknown,
  bestOf: unknown,
  scoreA: unknown,
  scoreB: unknown,
): SeriesClassification {
  if (
    typeof bestOf !== 'number' || !Number.isInteger(bestOf) || bestOf < 1 ||
    typeof scoreA !== 'number' || !Number.isInteger(scoreA) || scoreA < 0 ||
    typeof scoreB !== 'number' || !Number.isInteger(scoreB) || scoreB < 0 ||
    scoreA + scoreB > bestOf
  ) {
    return 'INVALID';
  }

  if (isDrawAllowed(format, bestOf)) {
    // ทุกแมพมีผู้ชนะ จึงรับเฉพาะผลที่เล่นครบ 2 แมพ: 2–0 · 0–2 · 1–1
    if (scoreA + scoreB !== 2) return 'INVALID';
    if (scoreA === scoreB) return 'DRAW';
    return scoreA > scoreB ? 'A' : 'B';
  }

  const winsNeeded = Math.floor(bestOf / 2) + 1;
  if (scoreA >= winsNeeded && scoreA > scoreB) return 'A';
  if (scoreB >= winsNeeded && scoreB > scoreA) return 'B';
  return 'INVALID';
}
