import { NextResponse } from 'next/server';
import type { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Server-side admin role gate — every Admin Command Room route must call this
 * before touching any RPC. This is the "Server Action (role check)" step of
 * the spec's Admin UI -> Server Action -> API Route -> RPC chain; it lives
 * inline in the Route Handler (matching every other admin-gated route already
 * shipped in this codebase — T2.4 dispute resolve, T4.0 verification
 * approve/reject) rather than a separate Server Action file, since Route
 * Handlers here already only ever run server-side.
 */
export async function requireAdminRole(
  supabase: SupabaseServerClient,
  allowedRoles: readonly string[]
): Promise<{ error: NextResponse } | { playerId: string; role: string }> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 }) };
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (playerError || !player) {
    return { error: NextResponse.json({ error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } }, { status: 404 }) };
  }

  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null)
    .single();

  if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
    return { error: NextResponse.json({ error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์เข้าถึงคำสั่งนี้' } }, { status: 403 }) };
  }

  return { playerId: player.id, role: userRole.role };
}
