// lib/veto/engine.ts
// Veto Step Engine — ตรรกะล้วน (ไม่ใช้ DB) ของการ Ban/Pick แมพ: อ่านลำดับจาก tournament_stages.veto_format,
// ตรวจว่าใครต้องทำอะไรในสเต็ปไหน, จับเวลาต่อสเต็ป, Auto-pick เมื่อหมดเวลา และ Decider อัตโนมัติ
// ทดสอบด้วย: npx tsx --test tests/veto-engine.test.ts
//
// รูปแบบ veto_format ที่รองรับ:
//   { "sequence": ["BAN","BAN","PICK","PICK","DECIDER"], "team_a_first": true, "time_limit_seconds": 60 }
//   sequence แต่ละช่องเป็นข้อความ หรือ object { "action": "BAN", "team": "A" | "B" | null }
// ทีมของสเต็ปแบบข้อความ: สลับกันทีละสเต็ปที่ไม่ใช่ DECIDER เริ่มจากทีม A (ถ้า team_a_first ไม่เป็น false)

export type VetoActionKind = 'BAN' | 'PICK' | 'DECIDER';
export type TeamSide = 'A' | 'B';

export interface VetoStep {
  step: number; // เริ่มที่ 1
  action: VetoActionKind;
  team: TeamSide | null; // null = ระบบทำเอง (DECIDER)
}

export interface VetoConfig {
  steps: VetoStep[];
  timeLimitSeconds: number | null; // null = ไม่จับเวลา
  teamAFirst: boolean;
  source: 'stage' | 'default';
  problems: string[]; // ปัญหาของ config (ถ้ามี ห้ามใช้งาน Ban/Pick จนกว่าจะแก้)
}

export interface VetoRowLike {
  step_order: number;
  action: string;
  team_id: string | null;
  map_name: string;
  created_at?: string | null;
  deadline_at?: string | null;
  was_auto?: boolean;
}

export interface PlannedVetoRow {
  step_order: number;
  action: VetoActionKind;
  team_id: string | null;
  map_name: string;
  was_auto: true;
  created_at: string;
  deadline_at: string | null;
}

export const DEFAULT_SEQUENCE: VetoActionKind[] = ['BAN', 'BAN', 'PICK', 'PICK', 'DECIDER'];
export const DEFAULT_TIME_LIMIT_SECONDS = 60;

const ACTIONS: readonly string[] = ['BAN', 'PICK', 'DECIDER'];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function sameMap(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function buildSteps(items: unknown[], teamAFirst: boolean, problems: string[]): VetoStep[] {
  const first: TeamSide = teamAFirst ? 'A' : 'B';
  const second: TeamSide = teamAFirst ? 'B' : 'A';
  let turn = 0; // นับเฉพาะสเต็ปที่ไม่ใช่ DECIDER
  const steps: VetoStep[] = [];

  items.forEach((item, idx) => {
    let action: string | null = null;
    let team: TeamSide | null | undefined;

    if (typeof item === 'string') {
      action = item.trim().toUpperCase();
    } else if (isObject(item)) {
      action = typeof item.action === 'string' ? item.action.trim().toUpperCase() : null;
      if (item.team === 'A' || item.team === 'B') team = item.team;
      else if (item.team === null) team = null;
    }

    if (!action || !ACTIONS.includes(action)) {
      problems.push(`สเต็ป ${idx + 1}: action "${String(typeof item === 'string' ? item : isObject(item) ? item.action : item)}" ไม่รองรับ (ใช้ BAN, PICK หรือ DECIDER)`);
      return;
    }

    const kind = action as VetoActionKind;
    if (kind === 'DECIDER') {
      steps.push({ step: idx + 1, action: kind, team: null });
      return;
    }

    const side: TeamSide = team === 'A' || team === 'B' ? team : turn % 2 === 0 ? first : second;
    turn += 1;
    steps.push({ step: idx + 1, action: kind, team: side });
  });

  return steps;
}

// อ่านลำดับจาก veto_format ของ Stage (ไม่ถูกต้อง/ว่าง → ลำดับเริ่มต้น 5 สเต็ป และบันทึกปัญหาถ้าค่าใน Stage ผิดรูปแบบ)
export function parseVetoFormat(raw: unknown): VetoConfig {
  const obj = isObject(raw) ? raw : null;
  const isEmpty = !obj || Object.keys(obj).length === 0;
  const teamAFirst = !obj || obj.team_a_first !== false;
  const problems: string[] = [];

  let timeLimitSeconds: number | null = null;
  if (isEmpty) {
    timeLimitSeconds = DEFAULT_TIME_LIMIT_SECONDS;
  } else if (obj && typeof obj.time_limit_seconds === 'number' && Number.isFinite(obj.time_limit_seconds) && obj.time_limit_seconds > 0) {
    timeLimitSeconds = Math.floor(obj.time_limit_seconds);
  }

  const rawSequence = obj && Array.isArray(obj.sequence) ? obj.sequence : null;
  const items: unknown[] = rawSequence && rawSequence.length > 0 ? rawSequence : DEFAULT_SEQUENCE;
  const source: 'stage' | 'default' = rawSequence && rawSequence.length > 0 ? 'stage' : 'default';

  const steps = buildSteps(items, teamAFirst, problems);
  if (steps.length === 0 && problems.length === 0) problems.push('veto_format ไม่มีสเต็ป');

  return { steps, timeLimitSeconds, teamAFirst, source, problems };
}

// ตรวจ config เทียบกับ Map Pool: ทุกสเต็ปใช้ 1 แมพ จึงต้องมีแมพอย่างน้อยเท่าจำนวนสเต็ป และห้ามมีแมพซ้ำใน Pool
export function validateConfig(config: VetoConfig, pool: string[]): string[] {
  const problems = [...config.problems];
  if (pool.length === 0) problems.push('map_pool ว่าง');
  const unique = new Set(pool.map((m) => m.trim().toLowerCase()));
  if (unique.size !== pool.length) problems.push('map_pool มีแมพซ้ำ');
  if (config.steps.length > pool.length) problems.push(`จำนวนสเต็ป (${config.steps.length}) มากกว่าจำนวนแมพใน Pool (${pool.length})`);
  const decider = config.steps.findIndex((s) => s.action === 'DECIDER');
  if (decider !== -1 && decider !== config.steps.length - 1) problems.push('DECIDER ต้องเป็นสเต็ปสุดท้าย');
  return problems;
}

export function remainingMaps(pool: string[], rows: VetoRowLike[]): string[] {
  return pool.filter((m) => !rows.some((r) => sameMap(r.map_name, m)));
}

export function canonicalMapName(pool: string[], name: string): string | null {
  return pool.find((m) => sameMap(m, name)) ?? null;
}

export function currentStep(config: VetoConfig, rows: VetoRowLike[]): VetoStep | null {
  return config.steps[rows.length] ?? null;
}

export function isVetoComplete(config: VetoConfig, rows: VetoRowLike[]): boolean {
  return config.steps.length > 0 && rows.length >= config.steps.length;
}

// เวลาที่เริ่ม Veto: ทั้งสองทีมกด Ready ครบเมื่อไร (ล่าสุดของสองเวลา) ไม่มีค่านี้ใช้เวลาอัปเดตแมตช์ล่าสุด
export function vetoStartMsFromMatch(match: { team_a_ready_at: string | null; team_b_ready_at: string | null; updated_at: string }): number {
  const times = [match.team_a_ready_at, match.team_b_ready_at].map((t) => (t ? Date.parse(t) : NaN)).filter((t) => Number.isFinite(t));
  if (times.length === 2) return Math.max(...times);
  const updated = Date.parse(match.updated_at);
  return Number.isFinite(updated) ? updated : Date.now();
}

export function teamIdForSide(side: TeamSide | null, teamAId: string | null, teamBId: string | null): string | null {
  if (side === 'A') return teamAId;
  if (side === 'B') return teamBId;
  return null;
}

// บทบาทในทีมที่ Ban/Pick แทนทีมได้
export const VETO_TEAM_ROLES: readonly string[] = ['CAPTAIN', 'MANAGER', 'COACH'];

// ฝั่งของผู้ใช้ในแมตช์นี้จากสมาชิกภาพ ACTIVE: ต้องเป็นผู้นำ (CAPTAIN / MANAGER / COACH) ของทีมเดียวเท่านั้น
// เป็นผู้นำของทั้งสองทีม (ข้อมูลเก่าที่เกิดจาก O12) หรือไม่ใช่ผู้นำเลย = null (ทำ Ban/Pick ไม่ได้)
export function vetoSideForMemberships(
  memberships: { team_id: string; role: string }[],
  teamAId: string | null,
  teamBId: string | null
): TeamSide | null {
  const leads = (teamId: string | null) => Boolean(teamId) && memberships.some((m) => m.team_id === teamId && VETO_TEAM_ROLES.includes(m.role));
  const isA = leads(teamAId);
  const isB = leads(teamBId);
  if (isA && !isB) return 'A';
  if (isB && !isA) return 'B';
  return null;
}

// เวลาเริ่มของสเต็ปปัจจุบัน = เวลาที่แถวล่าสุดถูกบันทึก (Auto-pick ใช้เวลาหมดเวลาของสเต็ปนั้น) ไม่มีแถวเลย = เวลาที่เริ่ม Veto
export function currentStepStartMs(rows: VetoRowLike[], vetoStartMs: number): number {
  if (rows.length === 0) return vetoStartMs;
  const last = rows.reduce((a, b) => (a.step_order >= b.step_order ? a : b));
  const t = last.created_at ? Date.parse(last.created_at) : NaN;
  return Number.isFinite(t) ? t : vetoStartMs;
}

// เวลาหมดของสเต็ปปัจจุบัน (ms) หรือ null ถ้าไม่จับเวลา / เป็นสเต็ป DECIDER / Veto จบแล้ว
export function currentDeadlineMs(config: VetoConfig, rows: VetoRowLike[], vetoStartMs: number): number | null {
  const step = currentStep(config, rows);
  if (!step || step.action === 'DECIDER' || !config.timeLimitSeconds) return null;
  return currentStepStartMs(rows, vetoStartMs) + config.timeLimitSeconds * 1000;
}

export type VetoValidation =
  | { ok: true; step: VetoStep; mapName: string; deadlineMs: number | null }
  | { ok: false; httpStatus: number; code: string; message: string };

// ตรวจคำสั่ง Ban/Pick จากทีมหนึ่ง: ต้องเป็นตาของทีมนั้น, action ตรงกับสเต็ป, แมพอยู่ใน Pool และยังไม่ถูกใช้
export function validateAction(
  config: VetoConfig,
  pool: string[],
  rows: VetoRowLike[],
  input: { side: TeamSide; action?: string | null; mapName: string },
  vetoStartMs: number
): VetoValidation {
  const problems = validateConfig(config, pool);
  if (problems.length > 0) {
    return { ok: false, httpStatus: 422, code: 'VETO_CONFIG_INVALID', message: `ตั้งค่า Veto ของ Stage ไม่ถูกต้อง: ${problems.join('; ')}` };
  }

  const step = currentStep(config, rows);
  if (!step) {
    return { ok: false, httpStatus: 409, code: 'VETO_COMPLETE', message: 'Veto ครบทุกสเต็ปแล้ว' };
  }
  if (step.action === 'DECIDER') {
    return { ok: false, httpStatus: 422, code: 'DECIDER_IS_AUTOMATIC', message: 'สเต็ปนี้เป็น DECIDER ระบบเลือกให้อัตโนมัติ' };
  }
  if (step.team !== input.side) {
    return { ok: false, httpStatus: 403, code: 'NOT_YOUR_TURN', message: `ตอนนี้เป็นตาของทีม ${step.team} (${step.action})` };
  }
  if (input.action && input.action.trim().toUpperCase() !== step.action) {
    return { ok: false, httpStatus: 422, code: 'WRONG_ACTION', message: `สเต็ป ${step.step} ต้องเป็น ${step.action}` };
  }

  const canonical = canonicalMapName(pool, input.mapName);
  if (!canonical) {
    return { ok: false, httpStatus: 422, code: 'INVALID_MAP', message: 'แมพนี้ไม่อยู่ใน Map Pool ของ Stage' };
  }
  if (rows.some((r) => sameMap(r.map_name, canonical))) {
    return { ok: false, httpStatus: 409, code: 'MAP_ALREADY_VETOED', message: 'แมพนี้ถูกแบนหรือเลือกไปแล้ว' };
  }

  return { ok: true, step, mapName: canonical, deadlineMs: currentDeadlineMs(config, rows, vetoStartMs) };
}

// สุ่มแบบกำหนดผลได้จาก seed (ผู้เรียกหลายรายพร้อมกันต้องได้แมพเดียวกัน)
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne(list: string[], rng: () => number): string {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

// แถวที่ระบบต้องเติมให้ ณ เวลา nowMs: (1) สเต็ปที่หมดเวลา → สุ่มแมพจากที่เหลือ (2) DECIDER ที่ถึงคิวแล้ว → สุ่มจากที่เหลือ
// สเต็ปที่หมดเวลาหลายอัน (ไม่มีใครเรียกระบบนาน) จะถูกเติมต่อเนื่องด้วยเวลาหมดจริงของแต่ละสเต็ป
export function planAutoSteps(
  config: VetoConfig,
  pool: string[],
  rows: VetoRowLike[],
  ctx: { nowMs: number; vetoStartMs: number; teamAId: string | null; teamBId: string | null; seed: string }
): PlannedVetoRow[] {
  if (validateConfig(config, pool).length > 0) return [];

  const planned: PlannedVetoRow[] = [];
  const working: VetoRowLike[] = [...rows];
  let cursor = currentStepStartMs(rows, ctx.vetoStartMs);

  for (;;) {
    const step = config.steps[working.length];
    if (!step) break;
    const remaining = remainingMaps(pool, working);
    if (remaining.length === 0) break;
    const rng = seededRng(`${ctx.seed}:${step.step}`);

    if (step.action === 'DECIDER') {
      const row: PlannedVetoRow = {
        step_order: step.step,
        action: 'DECIDER',
        team_id: null,
        map_name: pickOne(remaining, rng),
        was_auto: true,
        created_at: new Date(cursor).toISOString(),
        deadline_at: null,
      };
      planned.push(row);
      working.push(row);
      continue;
    }

    if (!config.timeLimitSeconds) break;
    const deadline = cursor + config.timeLimitSeconds * 1000;
    if (ctx.nowMs < deadline) break;

    const row: PlannedVetoRow = {
      step_order: step.step,
      action: step.action,
      team_id: teamIdForSide(step.team, ctx.teamAId, ctx.teamBId),
      map_name: pickOne(remaining, rng),
      was_auto: true,
      created_at: new Date(deadline).toISOString(),
      deadline_at: new Date(deadline).toISOString(),
    };
    planned.push(row);
    working.push(row);
    cursor = deadline;
  }

  return planned;
}
