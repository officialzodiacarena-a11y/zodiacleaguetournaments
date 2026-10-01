// lib/tournament/bracketBuilder.ts
// ตรรกะล้วนของหน้า "จัดสายการแข่งขัน" (/admin/tournaments/[id]/bracket) — แยกออกมาให้ทดสอบได้โดยไม่ต้องมี DB
import { hasAnyRole } from '@/lib/auth/hasAnyRole';

// role ที่ตัดสินข้อพิพาทได้ = role เดียวกับ is_admin() ใน DB และ /dispute/resolve (Q7/Q14 ของแอนดี้)
export const BRACKET_ADMIN_ROLES: readonly string[] = ['SUPER_ADMIN', 'ADMIN', 'REFEREE'];

export function canManageBrackets(roles: ReadonlyArray<{ role: unknown }> | null | undefined): boolean {
  return hasAnyRole(roles, BRACKET_ADMIN_ROLES);
}

// หน้าใหม่ให้เลือกแค่ 2 รูปแบบ (Q15 — ค่าอื่นของ enum seed route ยังไม่รองรับครบสำหรับงานเสาร์)
export const BRACKET_FORMATS = [
  { value: 'SINGLE_ELIMINATION', label: 'Single Elimination (แพ้ตกรอบ)' },
  { value: 'DOUBLE_ELIMINATION', label: 'Double Elimination (แพ้ 2 ครั้งตกรอบ)' },
] as const;

export type BracketFormat = (typeof BRACKET_FORMATS)[number]['value'];

export type BestOfPreset = 'BO1_ALL' | 'BO3_ALL' | 'BO1_FINALS_BO3';

export const BEST_OF_PRESETS: ReadonlyArray<{ value: BestOfPreset; label: string }> = [
  { value: 'BO1_ALL', label: 'Bo1 ทุกรอบ' },
  { value: 'BO3_ALL', label: 'Bo3 ทุกรอบ' },
  { value: 'BO1_FINALS_BO3', label: 'Bo1 + รอบรอง/ชิง Bo3' },
];

// รูปแบบ best_of_config ที่ seed route อ่าน (Q11): { default, semifinal?, final? } — ตัวเลขเท่านั้น
export function bestOfConfigForPreset(preset: BestOfPreset): Record<string, number> {
  switch (preset) {
    case 'BO3_ALL':
      return { default: 3 };
    case 'BO1_FINALS_BO3':
      return { default: 1, semifinal: 3, final: 3 };
    case 'BO1_ALL':
    default:
      return { default: 1 };
  }
}

export function presetFromBestOfConfig(config: unknown): BestOfPreset | null {
  if (!config || typeof config !== 'object') return null;
  const c = config as Record<string, unknown>;
  const keys = Object.keys(c).sort().join(',');
  if (keys === 'default' && c.default === 1) return 'BO1_ALL';
  if (keys === 'default' && c.default === 3) return 'BO3_ALL';
  if (keys === 'default,final,semifinal' && c.default === 1 && c.semifinal === 3 && c.final === 3) {
    return 'BO1_FINALS_BO3';
  }
  return null; // ค่าที่ตั้งไว้ด้วยมือ/นอกชุด preset
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// วันที่+เวลาแบบไทย (UTC+7) → ISO ที่ส่งเข้า API: YYYY-MM-DDTHH:mm:00+07:00 · ไม่ถูกต้อง → null
export function thaiLocalToIso(date: string, time: string): string | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const iso = `${date}T${time}:00+07:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

// ISO (ค่าจาก DB เป็น UTC ก็ได้) → วันที่/เวลาเขตไทยสำหรับใส่ในช่อง input
export function isoToThaiParts(iso: string | null | undefined): { date: string; time: string } | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const shifted = new Date(ms + 7 * 60 * 60 * 1000).toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ (เวลาไทยทำเป็นเวลา UTC เทียม)
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

// Fisher–Yates — ไม่แก้อาร์เรย์เดิม · rng ฉีดได้เพื่อเทสต์
export function shuffled<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return items.slice();
  const out = items.slice();
  const [picked] = out.splice(from, 1);
  out.splice(to, 0, picked);
  return out;
}

// ตรวจก่อนกด "ยืนยันจัดสาย": จำนวนทีมที่จัดต้องเท่ากับ teams_in (ถ้าตั้งไว้) และอย่างน้อย 2 ทีม
export function seedCountProblem(teamCount: number, teamsIn: number | null): string | null {
  if (teamCount < 2) return 'ต้องมีทีมที่อนุมัติแล้วอย่างน้อย 2 ทีม';
  if (teamsIn !== null && teamCount !== teamsIn) {
    return `จำนวนทีมไม่ตรง: สายตั้งไว้ ${teamsIn} ทีม แต่มีทีมที่อนุมัติแล้ว ${teamCount} ทีม — แก้จำนวนทีมของสาย หรือตรวจการอนุมัติทีมก่อน`;
  }
  return null;
}

const API_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'กรุณาเข้าสู่ระบบก่อน',
  FORBIDDEN: 'ไม่มีสิทธิ์ทำรายการนี้ (ต้องเป็นแอดมินหรือกรรมการ)',
  TOURNAMENT_NOT_FOUND: 'ไม่พบทัวร์นาเมนต์นี้',
  STAGE_NOT_FOUND: 'ไม่พบสายการแข่งขันนี้',
  DUPLICATE_STAGE_ORDER: 'ลำดับของสายนี้ซ้ำกับสายที่มีอยู่แล้ว — รีเฟรชหน้าแล้วลองใหม่',
  INVALID_ADVANCEMENT_CONFIG: 'จำนวนทีมที่เข้ารอบต้องไม่เกินจำนวนทีมของสาย',
  STAGE_ALREADY_STARTED: 'แก้ไขสายได้เฉพาะตอนที่ยังไม่เริ่ม (สถานะ PENDING)',
  STAGE_NOT_PENDING: 'จัดทีมลงสายได้เฉพาะตอนที่สายยังไม่เริ่ม (สถานะ PENDING)',
  UNSUPPORTED_STAGE_FORMAT: 'รูปแบบสายนี้ยังจัดทีมอัตโนมัติไม่ได้',
  UNSUPPORTED_TEAM_COUNT_FOR_FORMAT: 'จำนวนทีมนี้ใช้กับรูปแบบสายที่เลือกไม่ได้',
  TEAM_COUNT_MISMATCH: 'จำนวนทีมไม่ตรงกับที่ตั้งไว้ในสาย',
  BRACKET_ALREADY_GENERATED: 'จัดสายไปแล้ว ไม่สามารถจัดซ้ำได้',
  TEAM_NOT_CHECKED_IN: 'มีทีมที่ยังไม่ชำระ/ยังไม่ได้รับการอนุมัติ',
  BRACKET_GENERATION_FAILED: 'สร้างสายไม่สำเร็จ กรุณาลองใหม่',
  INVALID_STATUS_TRANSITION: 'เปลี่ยนสถานะสายข้ามขั้นไม่ได้',
  VALIDATION_ERROR: 'ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
  INTERNAL_ERROR: 'เกิดข้อผิดพลาดที่ระบบ กรุณาลองใหม่',
};

export const BRACKET_API_FALLBACK_MESSAGE = 'ทำรายการไม่สำเร็จ กรุณาลองใหม่';

// แปลง code จาก API เป็นข้อความไทยที่เข้าใจได้ — ไม่ส่ง message ดิบจาก server ขึ้นจอ (กันข้อความ DB ภายในรั่ว)
export function bracketApiErrorMessage(code: unknown): string {
  return typeof code === 'string' && API_ERROR_MESSAGES[code] ? API_ERROR_MESSAGES[code] : BRACKET_API_FALLBACK_MESSAGE;
}
