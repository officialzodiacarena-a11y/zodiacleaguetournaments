// lib/auth/require-broadcast-role.ts
// ตรวจสิทธิ์ผู้คุมการถ่ายทอด/ผลแข่ง (REFEREE / ADMIN / SUPER_ADMIN) สำหรับ Route Handler
// ใช้รูปแบบเดียวกับ PATCH /api/v1/matches/[id]/status แต่รองรับผู้ใช้ที่มีหลายบทบาท (ไม่ใช้ .single())
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const BROADCAST_ROLES: readonly string[] = ['REFEREE', 'ADMIN', 'SUPER_ADMIN'];

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type BroadcastRoleResult =
  | { ok: true; userId: string; playerId: string }
  | { ok: false; response: NextResponse };

export async function requireBroadcastRole(supabase: ServerClient): Promise<BroadcastRoleResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      ),
    };
  }

  const { data: player } = await supabase.from('players').select('id').eq('user_id', user.id).maybeSingle();
  if (!player) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบโปรไฟล์ผู้เล่นของบัญชีนี้' } },
        { status: 404 }
      ),
    };
  }

  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null);

  const allowed = (roles ?? []).some((r) => BROADCAST_ROLES.includes(String(r.role)));
  if (roleError || !allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีของคุณไม่มีสิทธิ์ในการควบคุมผลการแข่งขันนี้' } },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id, playerId: player.id };
}
