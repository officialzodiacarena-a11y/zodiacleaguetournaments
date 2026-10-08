// รายชื่อแมพ VALORANT ที่ให้แอดมินเลือกตอนสร้างสาย (ฟังก์ชันล้วน ไม่แตะ React ฐานข้อมูล และเครือข่าย)
// ที่มา: หน้า "VALORANT Custom Map Pool" ของ mapban.gg (ภาพที่พี่หยัดส่ง 2026-10-08) · สะกดตามภาพทุกตัวอักษร
// รายชื่อที่ใช้จริงของแต่ละรอบเก็บใน tournament_stages.map_pool ไม่ใช่ที่นี่ · แพทช์ใหม่เพิ่ม/เอาแมพออก = แก้ที่ไฟล์นี้ที่เดียว

export const VALORANT_MAPS: readonly string[] = [
  'Abyss',
  'Ascent',
  'Bind',
  'Breeze',
  'Corrode',
  'Fracture',
  'Haven',
  'Icebox',
  'Lotus',
  'Pearl',
  'Split',
  'Summit',
  'Sunset',
];

/** ชื่อตามรายการ (เทียบแบบไม่สนตัวพิมพ์/ช่องว่างหัวท้าย) · ไม่อยู่ในรายการ → null */
export function canonicalMapName(name: string): string | null {
  const key = name.trim().toLowerCase();
  return VALORANT_MAPS.find((m) => m.toLowerCase() === key) ?? null;
}

/** รายชื่อที่คัดลอกมาจากรอบก่อน: ชื่อที่ตรงรายการแปลงเป็นสะกดมาตรฐาน · ชื่ออื่นคงเดิม · ตัดซ้ำ */
export function normalizeMapPool(maps: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of maps) {
    const value = canonicalMapName(raw) ?? raw.trim();
    if (value === '') continue;
    if (!out.some((m) => m.toLowerCase() === value.toLowerCase())) out.push(value);
  }
  return out;
}

/** ติ๊ก/เอาติ๊กออก: เพิ่มต่อท้ายหรือเอาออก (ลำดับตามที่ติ๊ก) */
export function toggleMap(maps: readonly string[], name: string): string[] {
  const has = maps.some((m) => m.toLowerCase() === name.toLowerCase());
  return has ? maps.filter((m) => m.toLowerCase() !== name.toLowerCase()) : [...maps, name];
}

/** ชื่อในรายชื่อรอบนี้ที่ไม่อยู่ในรายการมาตรฐาน (ต้องแสดงให้แอดมินเห็นและลบได้) */
export function extraMaps(maps: readonly string[]): string[] {
  return maps.filter((m) => canonicalMapName(m) === null);
}
