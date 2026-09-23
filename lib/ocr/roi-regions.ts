// lib/ocr/roi-regions.ts
// ตำแหน่ง ROI (Region of Interest) ที่จะ crop จากเฟรม Canvas ของ Observer ก่อนส่งเข้า OCR
// ตาม SPEC-OCR-TELEMETRY-ROUNDS-V8.01-001 Section 1.2/4.1: ตัดเฉพาะพื้นที่ตัวหนังสือ (ชื่อ 10 คน +
// ป้ายจบรอบ) แทนที่จะ OCR ทั้งเฟรม 1080p เพื่อลด latency ลงเหลือ < 40ms
//
// ค่าพิกัดด้านล่างปรับเทียบครั้งแรกแล้ว (2026-09-23) จากภาพอ้างอิงจริงที่พี่หยัดส่งมา — broadcast HUD
// สไตล์ EWC 26 ที่ 1920x1080 (สไตล์เดียวกับที่ Overlay ของ Zodiac เองทำตาม, ดู "EWC-style HUD pass"):
// แผงผู้เล่น 5 คนต่อทีมชิดซ้าย/ขวาของจอ เริ่มจากกลางจอลงไปด้านล่าง แต่ละแถวสูง ~92px จากทั้งหมด 1080px
// ⚠️ ยังเป็นการประมาณจากภาพนิ่ง 1 ภาพเท่านั้น ไม่ใช่การวัดพิกเซลจริงบนภาพเคลื่อนไหวจริง — เชื่อได้ดีขึ้น
// กว่าค่าเดาล้วนๆ รอบก่อนมาก แต่ยังต้องทดสอบกับภาพจริง (กด START OCR CAPTURE) ก่อนใช้งานจริงเสมอ ถ้า
// ความละเอียดจอ/เลย์เอาต์ HUD ของนักพากย์ต่างจากภาพอ้างอิงนี้ ต้องปรับค่าตรงนี้ใหม่อีกรอบ

export interface RoiRegion {
  id: string;
  label: string;
  /** พิกัดเป็นสัดส่วน 0-1 ของความกว้าง/สูงเฟรมต้นฉบับ (resolution-independent) */
  x: number;
  y: number;
  width: number;
  height: number;
}

// แถบชื่อผู้เล่น 10 คน (5 ฝั่งซ้าย TEAM A, 5 ฝั่งขวา TEAM B)
// ปรับเทียบจากภาพอ้างอิงจริง: แผงผู้เล่นเริ่มที่ y≈0.51 ของจอ (กลางจอค่อนลงล่าง) แถวสูงแถวละ ~0.085
// (92px จาก 1080px) ชื่อผู้เล่นอยู่แถวบนสุดของแต่ละ slot (เหนือหลอด HP กับแถบไอคอนความสามารถ)
const ROW_TOP = 0.51;
const ROW_HEIGHT = 0.085;
const NAME_HEIGHT = 0.022; // เฉพาะบรรทัดชื่อ ไม่รวมหลอด HP/ไอคอนด้านล่าง

export const PLAYER_NAME_ROI: RoiRegion[] = [
  // ฝั่งซ้าย: [avatar][ชื่อ] ... ชื่อเริ่มหลัง avatar เล็กน้อย
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `team_a_${i}`,
    label: `Team A Slot ${i + 1}`,
    x: 0.043,
    y: ROW_TOP + i * ROW_HEIGHT,
    width: 0.09,
    height: NAME_HEIGHT,
  })),
  // ฝั่งขวา: เลย์เอาต์กลับด้าน [เลข HP/shield][avatar][ชื่อ] — ชื่ออยู่ใกล้ขอบขวาสุด
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `team_b_${i}`,
    label: `Team B Slot ${i + 1}`,
    x: 0.868,
    y: ROW_TOP + i * ROW_HEIGHT,
    width: 0.09,
    height: NAME_HEIGHT,
  })),
];

// หลอด HP ใต้ชื่อแต่ละคน (สีเขียว/แดง) — เผื่อใช้ในอนาคตถ้าอยากอ่านสีแทน/เสริม numeric readout
// ยังไม่ได้เอามาใช้ใน OcrObserverBridgePanel รอบนี้ (โฟกัสแค่ชื่อ + round banner ตามสโคป Atomic Task)
export const PLAYER_HP_BAR_ROI: RoiRegion[] = [
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `team_a_hp_${i}`,
    label: `Team A HP Bar ${i + 1}`,
    x: 0.043,
    y: ROW_TOP + NAME_HEIGHT + i * ROW_HEIGHT,
    width: 0.09,
    height: 0.01,
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `team_b_hp_${i}`,
    label: `Team B HP Bar ${i + 1}`,
    x: 0.868,
    y: ROW_TOP + NAME_HEIGHT + i * ROW_HEIGHT,
    width: 0.09,
    height: 0.01,
  })),
];

// ป้ายจบรอบตรงกลางจอ (เช่น "TEAM A ELIMINATED" / "SPIKE HAS BEEN DEFUSED")
// ⚠️ ภาพอ้างอิงที่มี (EWC 26) เป็นภาพระหว่างรอบกำลังเล่นอยู่ ไม่ใช่ตอนรอบเพิ่งจบ จึงยังไม่เห็นป้ายนี้
// จริง ค่าด้านล่างยังเป็นค่าประมาณเดิม (กลางจอ ใต้แถบคะแนนบนสุด) ต้องยืนยันกับภาพตอนรอบจบจริงอีกที
export const ROUND_BANNER_ROI: RoiRegion = {
  id: 'round_banner',
  label: 'Round-End Banner',
  x: 0.32,
  y: 0.42,
  width: 0.36,
  height: 0.08,
};

// เลขรอบปัจจุบัน — ปรับเทียบจากภาพอ้างอิง: "ROUND 10" + ตัวจับเวลา "1:38" อยู่กึ่งกลางจอบนสุด
// ใต้แถบ CURRENT/NEXT/DECIDER map banner เล็กน้อย
export const ROUND_NUMBER_ROI: RoiRegion = {
  id: 'round_number',
  label: 'Round Number',
  x: 0.45,
  y: 0.0,
  width: 0.1,
  height: 0.042,
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
