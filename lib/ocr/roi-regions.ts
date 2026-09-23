// lib/ocr/roi-regions.ts
// ตำแหน่ง ROI (Region of Interest) ที่จะ crop จากเฟรม Canvas ของ Observer ก่อนส่งเข้า OCR
// ตาม SPEC-OCR-TELEMETRY-ROUNDS-V8.01-001 Section 1.2/4.1: ตัดเฉพาะพื้นที่ตัวหนังสือ (ชื่อ 10 คน +
// ป้ายจบรอบ) แทนที่จะ OCR ทั้งเฟรม 1080p เพื่อลด latency ลงเหลือ < 40ms
//
// ⚠️ ค่าพิกัดด้านล่างเป็นค่าเริ่มต้น (placeholder) อิงตำแหน่ง HUD มาตรฐานของ VALORANT ที่ความละเอียด
// 1920x1080 เท่านั้น — โคลท์ไม่มีภาพหน้าจอนักพากย์จริงมาอ้างอิง (ground truth ที่มีคือแค่สเป็คข้อความ)
// Observer ต้องเข้าหน้า Pre-Map Roster Lock แล้วปรับ ROI ผ่าน UI Calibration (ลาก/รีไซส์กรอบบนพรีวิว)
// ก่อนใช้งานจริงครั้งแรกทุกครั้งที่ความละเอียด/เลย์เอาต์ HUD เปลี่ยน — ห้ามเชื่อค่า default เหล่านี้เป็น
// พิกัดที่แม่นยำจริงโดยไม่ตรวจสอบก่อน

export interface RoiRegion {
  id: string;
  label: string;
  /** พิกัดเป็นสัดส่วน 0-1 ของความกว้าง/สูงเฟรมต้นฉบับ (resolution-independent) */
  x: number;
  y: number;
  width: number;
  height: number;
}

// แถบชื่อผู้เล่น 10 คน (5 ฝั่งซ้าย TEAM A, 5 ฝั่งขวา TEAM B) — เลย์เอาต์ HUD มาตรฐาน VALORANT
export const PLAYER_NAME_ROI: RoiRegion[] = [
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `team_a_${i}`,
    label: `Team A Slot ${i + 1}`,
    x: 0.01,
    y: 0.1 + i * 0.045,
    width: 0.14,
    height: 0.035,
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `team_b_${i}`,
    label: `Team B Slot ${i + 1}`,
    x: 0.85,
    y: 0.1 + i * 0.045,
    width: 0.14,
    height: 0.035,
  })),
];

// ป้ายจบรอบตรงกลางจอ (เช่น "TEAM A ELIMINATED" / "SPIKE HAS BEEN DEFUSED")
export const ROUND_BANNER_ROI: RoiRegion = {
  id: 'round_banner',
  label: 'Round-End Banner',
  x: 0.32,
  y: 0.42,
  width: 0.36,
  height: 0.08,
};

// เลขรอบปัจจุบัน (มุมบนกึ่งกลางจอ)
export const ROUND_NUMBER_ROI: RoiRegion = {
  id: 'round_number',
  label: 'Round Number',
  x: 0.46,
  y: 0.01,
  width: 0.08,
  height: 0.04,
};

/** Crop ภาพจาก source canvas/video ตาม ROI (สัดส่วน) ออกมาเป็น canvas เล็กใหม่ พร้อมส่งเข้า OCR */
export function cropRoi(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  roi: RoiRegion
): HTMLCanvasElement {
  const sx = Math.round(roi.x * sourceWidth);
  const sy = Math.round(roi.y * sourceHeight);
  const sw = Math.round(roi.width * sourceWidth);
  const sh = Math.round(roi.height * sourceHeight);

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context ไม่พร้อมใช้งาน');
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}

/** ตีความข้อความ Round Banner ดิบว่าจบรอบด้วยเหตุผลอะไร (ตรงกับ win_condition_enum ใน DB) */
export function parseRoundBannerText(rawText: string): 'elimination' | 'spike_detonate' | 'spike_defuse' | 'time_expire' | null {
  const t = rawText.toUpperCase();
  if (t.includes('DEFUS')) return 'spike_defuse';
  if (t.includes('DETONAT') || t.includes('EXPLOD')) return 'spike_detonate';
  if (t.includes('ELIMINAT') || t.includes('DEFEAT')) return 'elimination';
  if (t.includes('TIME') && (t.includes('EXPIR') || t.includes('UP'))) return 'time_expire';
  return null;
}
