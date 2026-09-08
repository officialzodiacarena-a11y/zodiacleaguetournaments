import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: seasonId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบโปรไฟล์ในระบบลีก' } },
        { status: 404 }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', player.id)
      .is('revoked_at', null)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'ต้องการสิทธิ์ ADMIN หรือ SUPER_ADMIN' } },
        { status: 403 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: rowsUpdated, error: rpcError } = await adminSupabase.rpc(
      'recalculate_season_standings',
      { p_season_id: seasonId }
    );

    if (rpcError) {
      return NextResponse.json(
        { error: { code: 'RPC_FAILED', message: rpcError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      season_id: seasonId,
      rows_updated: rowsUpdated as number,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
