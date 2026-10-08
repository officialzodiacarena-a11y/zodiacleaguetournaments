// lib/match/lobby-access.ts
// ตรรกะล้วน (ไม่ใช้ DB) ของ "ใครเปิดข้อมูลห้อง Lobby ของแมตช์ได้" สำหรับ GET /api/v1/matches/[id]/lobby
// เดิม route นี้ไม่ตรวจผู้เรียกเลย และคืนรหัสห้องเกม (lobby_code) รายชื่อสมาชิก และข้อความแชท ให้ทุกคนที่รู้รหัสแมตช์
// ตอนนี้: ต้องล็อกอิน และเป็นสตาฟ (ADMIN / SUPER_ADMIN / กรรมการของแมตช์นี้) หรือสมาชิก ACTIVE ของทีม A/B ของแมตช์นี้
// กติกาเดียวกับ POST/GET lobby/messages (ที่ตรวจ 401/403 อยู่แล้ว)
// ทดสอบด้วย: npx tsx --test tests/lobby-access.test.ts

export interface LobbyMembership {
  team_id: string;
}

export interface LobbyAccessInput {
  isAuthenticated: boolean;
  isStaff: boolean; // ADMIN / SUPER_ADMIN / REFEREE (บทบาท) หรือเป็นกรรมการของแมตช์นี้
  teamAId: string | null;
  teamBId: string | null;
  memberships: LobbyMembership[]; // สมาชิก ACTIVE ของผู้เรียกในสองทีมของแมตช์นี้
}

export type LobbyAccessResult =
  | { ok: true; via: 'STAFF' | 'TEAM_A' | 'TEAM_B' }
  | { ok: false; httpStatus: 401 | 403; code: 'UNAUTHORIZED' | 'FORBIDDEN'; message: string };

export function decideLobbyAccess(input: LobbyAccessInput): LobbyAccessResult {
  if (!input.isAuthenticated) {
    return { ok: false, httpStatus: 401, code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' };
  }
  if (input.isStaff) return { ok: true, via: 'STAFF' };

  const teamIds = new Set(input.memberships.map((m) => m.team_id));
  if (input.teamAId && teamIds.has(input.teamAId)) return { ok: true, via: 'TEAM_A' };
  if (input.teamBId && teamIds.has(input.teamBId)) return { ok: true, via: 'TEAM_B' };

  return { ok: false, httpStatus: 403, code: 'FORBIDDEN', message: 'คุณไม่มีสิทธิ์เข้าถึงห้องล็อบบี้แมตช์นี้' };
}
