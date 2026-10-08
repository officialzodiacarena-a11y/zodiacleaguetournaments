// lib/store/brand-display.ts
// กติกาแสดงแบรนด์ในร้านค้า (ฟังก์ชันล้วน ไม่แตะ React ฐานข้อมูล และเครือข่าย)
// ที่มา: Master Spec Commerce Hub Phase A หมวด 7 K4 — เลิกฝังชื่อแบรนด์ในโค้ด ใช้ตาราง brands แทน
//   ป้ายสปอนเซอร์แสดงเฉพาะเมื่อแบรนด์ผูกสปอนเซอร์ (brands.sponsor_id) · ลิงก์หน้าแบรนด์ = /sponsor/<brands.slug> เฉพาะแบรนด์ที่ผูกสปอนเซอร์
// สินค้าที่ยังไม่มี brand_id (เพิ่มก่อน K4 ด้วย partner_brand อย่างเดียว) แสดงชื่อจาก partner_brand เป็นป้ายธรรมดา

export interface StoreBrand {
  slug: string;
  name: string;
  badge_icon: string | null;
  /** true = แบรนด์ผูกสปอนเซอร์ (brands.sponsor_id ไม่ว่าง) */
  has_sponsor: boolean;
}

export type BrandBadge = { label: string; tone: 'SPONSOR' | 'BRAND'; icon: string | null };

export function brandBadge(brand: StoreBrand | null | undefined, partnerBrand: string | null | undefined): BrandBadge | null {
  if (brand) {
    return { label: brand.name, tone: brand.has_sponsor ? 'SPONSOR' : 'BRAND', icon: brand.badge_icon };
  }
  const text = partnerBrand?.trim();
  return text ? { label: text, tone: 'BRAND', icon: null } : null;
}

/** ลิงก์ "ดูข้อมูลแบรนด์" · มีเฉพาะแบรนด์ที่ผูกสปอนเซอร์ (มีหน้า /sponsor/<slug>) */
export function brandPageHref(brand: StoreBrand | null | undefined): string | null {
  if (!brand || !brand.has_sponsor) return null;
  return `/sponsor/${encodeURIComponent(brand.slug)}`;
}

/** ป้ายหมวดหมู่ในแถบกรอง: ไอคอนของแบรนด์นำหน้าชื่อ (ถ้ามี) */
export function categoryTabLabel(name: string, brand: Pick<StoreBrand, 'badge_icon'> | null | undefined): string {
  const icon = brand?.badge_icon?.trim();
  return icon ? `${icon} ${name}` : name;
}

/** แปลงแถว brands จาก PostgREST (sponsor_id) เป็นรูปแบบที่ API ส่งออก (ไม่เปิดเผย sponsor_id) */
export function toStoreBrand(
  row: { slug: string; name: string; badge_icon: string | null; sponsor_id: string | null } | null | undefined,
): StoreBrand | null {
  if (!row) return null;
  return { slug: row.slug, name: row.name, badge_icon: row.badge_icon, has_sponsor: row.sponsor_id !== null };
}
