// lib/ocr/hp-bar.ts
// อ่านค่า HP จากหลอดเลือดบน HUD ของ Observer — SPEC-OCR-TELEMETRY-ROUNDS-V8.01-001 Section 1 (สแกน HP)
// ไม่ใช้ OCR ตัวเลข: วัด "สัดส่วนพิกเซลที่สว่าง" ในแนวนอนของหลอดแทน (ส่วนที่มีเลือดสว่าง ส่วนที่หมดเป็นพื้นแผงสีเข้ม)
// เร็วกว่า Tesseract มาก และไม่พังเพราะอ่านตัวเลขผิด นับแบบไม่สนทิศ จึงใช้ได้ทั้งหลอดที่ลดจากซ้ายหรือจากขวา
// ⚠️ ขึ้นกับ PLAYER_HP_BAR_ROI (lib/ocr/roi-regions.ts) ที่ปรับเทียบจากภาพนิ่งภาพเดียว — ต้องเทียบกับฟีดจริงก่อนใช้

/** ความสว่างขั้นต่ำ (0–255) ที่นับว่าเป็นส่วนที่ "มีเลือด" — พื้นแผง HUD ที่หมดเลือดมืดกว่านี้มาก */
export const HP_FILLED_LUMA = 110;

/** ต้องมีคอลัมน์ที่สว่างกี่ % ของความสูงหลอด ถึงนับว่าคอลัมน์นั้นมีเลือด (กันจุดรบกวน/ขอบกรอบ) */
const COLUMN_FILL_RATIO = 0.5;

/**
 * แปลงพิกเซล RGBA ของหลอด HP (จาก getImageData) เป็นค่า HP 0–100
 * นับคอลัมน์ที่สว่างเกินเกณฑ์ หารด้วยความกว้างทั้งหมด
 */
export function hpPercentFromPixels(data: Uint8ClampedArray, width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0;
  let filledColumns = 0;
  for (let x = 0; x < width; x++) {
    let bright = 0;
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (luma >= HP_FILLED_LUMA) bright++;
    }
    if (bright / height >= COLUMN_FILL_RATIO) filledColumns++;
  }
  return Math.round((filledColumns / width) * 100);
}

/** อ่านค่า HP จาก canvas ที่ crop หลอดเลือดมาแล้ว (ผลจาก cropRoi กับ PLAYER_HP_BAR_ROI) */
export function readHpFromCanvas(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width === 0 || canvas.height === 0) return 0;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return hpPercentFromPixels(data, canvas.width, canvas.height);
}
