// lib/veto/stageConfig.ts
// ตัวตรวจ veto_format + map_pool ตัวเดียวของ tournament_stages ที่ทุกทางเขียน (สร้าง 2 ทาง + แก้ PATCH) ต้องผ่านก่อนบันทึก
// - veto_format ไม่ส่งมา / null / {} → ใช้ค่าเริ่มต้น (ลำดับ BAN, BAN, PICK, PICK, DECIDER · 60 วินาที)
// - ตัดสินว่าใช้ได้หรือไม่ด้วย parseVetoFormat + validateConfig ของ lib/veto/engine.ts เท่านั้น (ไม่มีกติกาซ้ำ)
// - map_pool ยังไม่บังคับ (ยังไม่มีรายชื่อแมพตั้งต้นใน repo): null / ไม่ส่งมา = ยังไม่ตั้ง ไม่ถูกปฏิเสธ · ถ้าส่งมาเป็นอาร์เรย์ ต้องผ่าน validateConfig เต็ม
// ทดสอบด้วย: npx tsx --test tests/stage-veto-config.test.ts
import type { Json } from '@/types/database.types';
import { DEFAULT_SEQUENCE, DEFAULT_TIME_LIMIT_SECONDS, parseVetoFormat, validateConfig } from '@/lib/veto/engine';

export const INVALID_VETO_CONFIG = 'INVALID_VETO_CONFIG';

// ค่าเริ่มต้นของ veto_format ที่บันทึกลง Stage (ย้ายมาจาก app/api/v1/tournaments/[id]/stages/route.ts — ห้ามเปลี่ยนลำดับขั้น)
export function defaultVetoFormat(): { sequence: string[]; team_a_first: boolean; time_limit_seconds: number } {
  return { sequence: [...DEFAULT_SEQUENCE], team_a_first: true, time_limit_seconds: DEFAULT_TIME_LIMIT_SECONDS };
}

export type StageVetoResult =
  | { ok: true; veto_format: Json; map_pool: string[] | null }
  | { ok: false; code: typeof INVALID_VETO_CONFIG; message: string; problems: string[] };

function fail(problems: string[]): StageVetoResult {
  return { ok: false, code: INVALID_VETO_CONFIG, message: `ตั้งค่า Veto ของรอบแข่งไม่ถูกต้อง: ${problems.join('; ')}`, problems };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// รับค่าที่จะบันทึก (หรือค่ารวมหลังแก้) → คืนค่าที่พร้อมบันทึก หรือ error ที่บอกว่าผิดตรงไหน
export function resolveStageVetoConfig(input: { veto_format?: unknown; map_pool?: unknown }): StageVetoResult {
  const rawFormat = input.veto_format;
  const rawPool = input.map_pool;

  if (rawFormat !== undefined && rawFormat !== null && !isPlainObject(rawFormat)) {
    return fail(['veto_format ต้องเป็น object (เช่น { "sequence": [...] })']);
  }

  let pool: string[] | null = null;
  if (rawPool !== undefined && rawPool !== null) {
    if (!Array.isArray(rawPool) || !rawPool.every((item) => typeof item === 'string')) {
      return fail(['map_pool ต้องเป็นอาร์เรย์ของข้อความ (ชื่อแมพ)']);
    }
    pool = rawPool;
  }

  const format = isPlainObject(rawFormat) && Object.keys(rawFormat).length > 0 ? rawFormat : defaultVetoFormat();
  const config = parseVetoFormat(format);

  // ยังไม่ตั้ง map_pool: ตรวจเฉพาะส่วนที่ไม่ขึ้นกับรายชื่อแมพ (ลำดับขั้น/DECIDER) ด้วย validateConfig ตัวเดิม โดยใช้ที่ว่างแทนแมพเท่าจำนวนสเต็ป (ไม่บันทึกลงฐานข้อมูล)
  const poolForCheck = pool ?? config.steps.map((_, i) => `__unset_${i}`);
  const problems = validateConfig(config, poolForCheck);
  if (problems.length > 0) return fail(problems);

  return { ok: true, veto_format: format as Json, map_pool: pool };
}
