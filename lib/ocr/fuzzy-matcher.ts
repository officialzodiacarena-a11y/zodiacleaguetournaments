// lib/ocr/fuzzy-matcher.ts
// Normalized Levenshtein Fuzzy Matching สำหรับจับคู่ชื่อที่ OCR อ่านได้จากหน้าจอนักพากย์
// กับรายชื่อผู้เล่น 10 คนที่ถูกล็อกไว้ต่อแม็พ (Pre-Map Roster Lock, ดู pre-map-roster.ts)
// ตาม SPEC-OCR-TELEMETRY-ROUNDS-V8.01-001 Section 1.4
// อ้างอิงเทียบผลลัพธ์กับ tests/stress/ocr_noise_resiliency.test.ts (ST-OCR-01) ในสเป็ค — ห้ามเปลี่ยน
// signature ของ matchOcrPlayerName() โดยไม่แก้เทสนั้นด้วย

export interface LockedRosterCandidate {
  id: string;
  ign: string;
}

export type OcrMatchStatus = 'EXACT' | 'FUZZY' | 'UNMATCHED';

export interface OcrMatchResult {
  matched_player_id: string | null;
  confidence: number;
  status: OcrMatchStatus;
  sanitized_input: string;
}

const CLAN_TAG_PATTERN = /^[A-Z0-9]{1,5}[_\s]+/;
const SPECIAL_CHARS_PATTERN = /[_\-.#|!]/g;

/**
 * แปลงชื่อดิบจาก OCR ให้พร้อมเทียบ: ตัวพิมพ์ใหญ่ทั้งหมด, ตัด Clan Tag หน้าชื่อ (เช่น "G2 ", "PRX_"),
 * ลบสัญลักษณ์พิเศษ, ตัดช่องว่างส่วนเกิน
 */
export function sanitizeOcrName(raw: string): string {
  let s = raw.toUpperCase().trim();
  s = s.replace(CLAN_TAG_PATTERN, '');
  s = s.replace(SPECIAL_CHARS_PATTERN, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Levenshtein edit distance มาตรฐาน (insert/delete/substitute = 1) */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const currRow = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow = currRow;
  }
  return prevRow[n];
}

/**
 * จับคู่ชื่อที่ OCR อ่านได้กับ Candidate Array 10 คนที่ล็อกไว้ของแม็พนั้น (ดูหัวข้อ 1.3 ในสเป็ค)
 * Thresholds ตามสเป็ค:
 *  - Distance 0            -> EXACT,  confidence 100
 *  - Distance 1-2 (name >= 4 ตัวอักษร) -> FUZZY, confidence 80-95 (เชิงเส้นตามระยะห่าง)
 *  - อื่นๆ                  -> UNMATCHED, confidence 0
 */
export function matchOcrPlayerName(rawName: string, lockedRoster: LockedRosterCandidate[]): OcrMatchResult {
  const sanitizedInput = sanitizeOcrName(rawName);

  if (!sanitizedInput || lockedRoster.length === 0) {
    return { matched_player_id: null, confidence: 0, status: 'UNMATCHED', sanitized_input: sanitizedInput };
  }

  let best: { candidate: LockedRosterCandidate; distance: number } | null = null;

  for (const candidate of lockedRoster) {
    const sanitizedCandidate = sanitizeOcrName(candidate.ign);
    const distance = levenshteinDistance(sanitizedInput, sanitizedCandidate);
    if (!best || distance < best.distance) {
      best = { candidate, distance };
    }
  }

  if (!best) {
    return { matched_player_id: null, confidence: 0, status: 'UNMATCHED', sanitized_input: sanitizedInput };
  }

  if (best.distance === 0) {
    return {
      matched_player_id: best.candidate.id,
      confidence: 100,
      status: 'EXACT',
      sanitized_input: sanitizedInput,
    };
  }

  if (best.distance <= 2 && sanitizedInput.length >= 4) {
    // Distance 1 -> confidence 95, Distance 2 -> confidence 80 (เชิงเส้นตามช่วงที่สเป็คกำหนด 80-95)
    const confidence = best.distance === 1 ? 95 : 80;
    return {
      matched_player_id: best.candidate.id,
      confidence,
      status: 'FUZZY',
      sanitized_input: sanitizedInput,
    };
  }

  return { matched_player_id: null, confidence: 0, status: 'UNMATCHED', sanitized_input: sanitizedInput };
}
