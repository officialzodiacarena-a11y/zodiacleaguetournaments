// lib/auth/hasAnyRole.ts
// ตรวจสิทธิ์แบบรองรับผู้ใช้ที่มีหลาย role พร้อมกัน (เช่น ATHLETE + ADMIN)
// ห้ามดึง user_roles ด้วย .single() — คนที่มีหลายแถวจะได้ error แล้วถูกตีเป็น 403 ทั้งที่เป็นแอดมินจริง
import type { createClient } from '@/lib/supabase/server';

export const MATCH_STAFF_ROLES: readonly string[] = ['REFEREE', 'ADMIN', 'SUPER_ADMIN'];

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export function hasAnyRole(
  roles: ReadonlyArray<{ role: unknown }> | null | undefined,
  allowed: readonly string[]
): boolean {
  return (roles ?? []).some((r) => allowed.includes(String(r.role)));
}

// ดึงทุก role ที่ยังไม่ถูก revoke ของผู้เล่น แล้วเช็คว่ามีอย่างน้อยหนึ่ง role ที่อนุญาต
// error ของ DB → ถือว่าไม่มีสิทธิ์ (fail closed)
export async function playerHasAnyRole(
  supabase: ServerClient,
  playerId: string,
  allowed: readonly string[] = MATCH_STAFF_ROLES
): Promise<boolean> {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', playerId)
    .is('revoked_at', null);

  if (error) return false;
  return hasAnyRole(roles, allowed);
}
