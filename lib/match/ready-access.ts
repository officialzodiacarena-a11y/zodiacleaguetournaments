// lib/match/ready-access.ts
// ตรรกะล้วน (ไม่ใช้ DB) ของ "ใครกด Ready ให้ทีมไหนได้" สำหรับ POST /api/v1/matches/[id]/ready
// เดิม route นี้ upsert ผู้กดเป็น CAPTAIN ของทีมโดยไม่ตรวจสิทธิ์ (O12) — ตอนนี้ห้ามสร้าง/แก้ team_members จากปุ่ม Ready เด็ดขาด
// ทดสอบด้วย: npx tsx --test tests/ready-access.test.ts

export type ReadySide = 'A' | 'B';

// บทบาทในทีมที่กด Ready ให้ทีมตัวเองได้ (PLAYER / SUBSTITUTE กดไม่ได้)
export const READY_TEAM_ROLES: readonly string[] = ['OWNER', 'CAPTAIN', 'MANAGER', 'COACH'];

// บทบาทสตาฟที่กด Ready แทนทีมใดก็ได้ (CASTER ไม่รวม เพราะเป็นบทบาทถ่ายทอดสด)
export const READY_STAFF_ROLES: readonly string[] = ['ADMIN', 'SUPER_ADMIN', 'REFEREE'];

export interface ReadyMembership {
  team_id: string;
  role: string;
}

export interface ReadyAccessInput {
  rawSide: unknown; // ค่า `side` จาก body: 'team_a' | 'team_b' | ไม่ระบุ
  teamAId: string | null;
  teamBId: string | null;
  teamAReadyAt: string | null;
  isStaff: boolean;
  memberships: ReadyMembership[]; // สมาชิก ACTIVE ของผู้กดในสองทีมของแมตช์นี้
}

export type ReadyAccessResult =
  | { ok: true; side: ReadySide; teamId: string }
  | { ok: false; code: string; message: string; httpStatus: number };

function fail(code: string, message: string, httpStatus: number): ReadyAccessResult {
  return { ok: false, code, message, httpStatus };
}

export function isStaffRole(roles: readonly string[]): boolean {
  return roles.some((role) => READY_STAFF_ROLES.includes(role));
}

function parseSide(raw: unknown): ReadySide | null | 'INVALID' {
  if (raw === undefined || raw === null || raw === '') return null;
  if (raw === 'team_a') return 'A';
  if (raw === 'team_b') return 'B';
  return 'INVALID';
}

// กติกา A7: เลย forfeit_deadline_at แล้วถือว่าหมดเวลายืนยันความพร้อม — ใช้ทั้ง API และหน้า Lobby (กฎอยู่ที่นี่ที่เดียว)
export function isReadyDeadlinePassed(forfeitDeadlineAt: string | null | undefined, nowMs: number): boolean {
  if (!forfeitDeadlineAt) return false;
  const deadlineMs = new Date(forfeitDeadlineAt).getTime();
  if (Number.isNaN(deadlineMs)) return false;
  return nowMs >= deadlineMs;
}

// ช่วงยืนยันความพร้อม 15 นาที — เลขนี้อยู่ที่เดียว ห้ามใส่ 15 * 60 * 1000 ที่อื่น
export const READY_WINDOW_MS = 15 * 60 * 1000;

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

// เวลานัดที่ใช้จริง = scheduled_at หรือ created_at อันไหนช้ากว่า (แมตช์ที่เพิ่งสร้างหลังเวลานัดนับจากตอนสร้าง)
// scheduled_at ว่างหรืออ่านไม่ออก = ไม่มีเวลานัดที่ใช้จริง
export function scheduleBaseMs(scheduledAt: string | null | undefined, createdAt: string | null | undefined): number | null {
  const scheduledMs = parseMs(scheduledAt);
  if (scheduledMs === null) return null;
  const createdMs = parseMs(createdAt);
  return createdMs !== null && createdMs > scheduledMs ? createdMs : scheduledMs;
}

export interface EffectiveReadyDeadlineInput {
  forfeitDeadlineAt: string | null | undefined;
  scheduledAt: string | null | undefined;
  createdAt: string | null | undefined;
  teamAReadyAt: string | null | undefined;
  teamBReadyAt: string | null | undefined;
}

// เส้นตายยืนยันความพร้อมที่ใช้จริง (ISO) — ใช้ร่วม API กดพร้อม / Lobby / cron
// มี forfeit_deadline_at = ใช้ค่านั้น · ยังไม่มีทีมกดและไม่มีค่า = เวลานัดที่ใช้จริง + 15 นาที · ไม่เข้าเงื่อนไข = null
export function effectiveReadyDeadline(input: EffectiveReadyDeadlineInput): string | null {
  const forfeitMs = parseMs(input.forfeitDeadlineAt);
  if (forfeitMs !== null) return new Date(forfeitMs).toISOString();
  if (input.teamAReadyAt || input.teamBReadyAt) return null;
  const baseMs = scheduleBaseMs(input.scheduledAt, input.createdAt);
  if (baseMs === null) return null;
  return new Date(baseMs + READY_WINDOW_MS).toISOString();
}

// เส้นตายตอนทีมแรกกดพร้อม = (เวลากด หรือ เวลานัดที่ใช้จริง อันไหนช้ากว่า) + 15 นาที
export function firstPressDeadlineMs(
  nowMs: number,
  scheduledAt: string | null | undefined,
  createdAt: string | null | undefined,
): number {
  const baseMs = scheduleBaseMs(scheduledAt, createdAt);
  return Math.max(nowMs, baseMs ?? nowMs) + READY_WINDOW_MS;
}

export function decideReadyAccess(input: ReadyAccessInput): ReadyAccessResult {
  const requested = parseSide(input.rawSide);
  if (requested === 'INVALID') {
    return fail('INVALID_SIDE', "side ต้องเป็น 'team_a' หรือ 'team_b'", 400);
  }

  const teamIdOf = (side: ReadySide) => (side === 'A' ? input.teamAId : input.teamBId);

  // ทีมของผู้กดที่มีสิทธิ์กด Ready (ต้องเป็นสมาชิก ACTIVE และมีบทบาทผู้นำทีม)
  const eligibleSides: ReadySide[] = [];
  for (const side of ['A', 'B'] as const) {
    const teamId = teamIdOf(side);
    if (!teamId) continue;
    const allowed = input.memberships.some((m) => m.team_id === teamId && READY_TEAM_ROLES.includes(m.role));
    if (allowed) eligibleSides.push(side);
  }

  let side: ReadySide | null = null;

  if (requested) {
    if (!teamIdOf(requested)) {
      return fail('TEAM_NOT_ASSIGNED', `ฝั่ง ${requested} ของแมตช์นี้ยังไม่มีทีม`, 422);
    }
    if (!input.isStaff && !eligibleSides.includes(requested)) {
      return fail('FORBIDDEN', 'กด Ready ได้เฉพาะ Captain / Manager / Coach / Owner ของทีมนั้น หรือสตาฟผู้ตัดสิน', 403);
    }
    side = requested;
  } else if (eligibleSides.length === 1) {
    side = eligibleSides[0];
  } else if (eligibleSides.length > 1) {
    return fail('SIDE_REQUIRED', 'บัญชีนี้เป็นผู้นำของทั้งสองทีม กรุณาระบุ side', 400);
  } else if (input.isStaff) {
    // สตาฟที่ไม่ระบุ side: กดให้ฝั่งที่ยังไม่ Ready ก่อน (พฤติกรรมเดิม)
    side = !input.teamAReadyAt && input.teamAId ? 'A' : 'B';
    if (!teamIdOf(side)) {
      return fail('TEAM_NOT_ASSIGNED', 'แมตช์นี้ยังจับสายทีมไม่ครบ', 422);
    }
  } else {
    return fail('FORBIDDEN', 'กด Ready ได้เฉพาะ Captain / Manager / Coach / Owner ของทีม หรือสตาฟผู้ตัดสิน', 403);
  }

  return { ok: true, side, teamId: teamIdOf(side) as string };
}
