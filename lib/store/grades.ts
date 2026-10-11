// lib/store/grades.ts
// เกรดสินค้า 1-8 (store_items.shop_grade) · ชื่อ สี และกติกาแสดงผลที่เดียว ใช้ร่วมกันทั้งหน้าแอดมินและหน้าร้าน (ฟังก์ชันล้วน)
// ที่มา: สเปกพี่ศิลา B1 + บรีฟพี่ไอซ์ หมวด 2.1 (ขาว เขียว ฟ้า น้ำเงิน ม่วง ชมพู ทอง/ส้ม แดง) · ฐานข้อมูลเก็บเป็นตัวเลขอย่างเดียว

export const MIN_SHOP_GRADE = 1;
export const MAX_SHOP_GRADE = 8;
/** เกรดตั้งแต่ค่านี้ขึ้นไปต้องมีจำนวนผลิตทั้งหมดหรือหลักฐาน และห้ามเติมสต็อก/เพิ่มรุ่นย่อย/ลดเกรดผ่าน API */
export const HIGH_GRADE_MIN = 6;

export interface ShopGradeInfo {
  grade: number;
  name: string;
  /** สีหลักของป้าย (hex) · ป้ายใช้ตัวอักษรสีนี้ พื้นหลัง/ขอบโปร่งจากสีเดียวกัน */
  color: string;
}

export const SHOP_GRADES: readonly ShopGradeInfo[] = [
  { grade: 1, name: 'Common', color: '#E2E8F0' },
  { grade: 2, name: 'Uncommon', color: '#4CAF50' },
  { grade: 3, name: 'Rare', color: '#5BA8D4' },
  { grade: 4, name: 'Premium', color: '#4F6BED' },
  { grade: 5, name: 'Exclusive', color: '#9184D9' },
  { grade: 6, name: 'Limited', color: '#F472B6' },
  { grade: 7, name: 'Collector', color: '#E8B429' },
  { grade: 8, name: 'Legendary', color: '#E3322F' },
];

export function isValidShopGrade(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= MIN_SHOP_GRADE && v <= MAX_SHOP_GRADE;
}

export function isHighGrade(grade: number | null | undefined): boolean {
  return typeof grade === 'number' && grade >= HIGH_GRADE_MIN;
}

export function gradeInfo(grade: number | null | undefined): ShopGradeInfo {
  return SHOP_GRADES.find((g) => g.grade === grade) ?? SHOP_GRADES[0];
}

/** ป้ายบนหน้าร้าน · เกรด 1 Common ไม่แสดงป้าย (กันป้ายรกทุกการ์ด) · เกรด >= 6 ที่มี limit แสดง "จำกัด N ชิ้น" */
export function gradeBadge(
  grade: number | null | undefined,
  limitTotal: number | null | undefined
): { label: string; color: string; limitText: string | null } | null {
  if (!grade || grade <= 1) return null;
  const info = gradeInfo(grade);
  const limitText = isHighGrade(grade) && limitTotal && limitTotal > 0 ? `จำกัด ${limitTotal.toLocaleString()} ชิ้น` : null;
  return { label: info.name, color: info.color, limitText };
}

/** แปลง error จากฐานข้อมูล (trigger/CHECK ของ K2 และ K2b) เป็นข้อความไทย · ไม่ใช่ error เกรด → null */
export function mapGradeDbError(message: string | null | undefined): { code: string; message: string } | null {
  const m = message ?? '';
  if (m.includes('GRADE_NO_RESTOCK')) return { code: 'GRADE_NO_RESTOCK', message: 'สินค้าเกรด 6 ขึ้นไปเติมสต็อกไม่ได้' };
  if (m.includes('GRADE_NO_NEW_VARIANT')) return { code: 'GRADE_NO_NEW_VARIANT', message: 'สินค้าเกรด 6 ขึ้นไปเพิ่มรุ่นย่อยไม่ได้' };
  if (m.includes('GRADE_NO_DOWNGRADE')) return { code: 'GRADE_NO_DOWNGRADE', message: 'ลดเกรดจาก 6 ขึ้นไปทำได้เฉพาะผู้ดูแลฐานข้อมูล' };
  if (m.includes('store_items_high_grade_evidence_check')) {
    return { code: 'GRADE_EVIDENCE_REQUIRED', message: 'เกรด 6 ขึ้นไปต้องใส่จำนวนผลิตทั้งหมดหรือหลักฐาน' };
  }
  return null;
}
