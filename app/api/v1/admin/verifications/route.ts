import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VERIFICATION_STATUS_VALUES } from '@/types/verification';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
      { status: 401 }
    ) };
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (playerError || !player) {
    return { error: NextResponse.json(
      { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
      { status: 404 }
    ) };
  }

  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null)
    .single();

  const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
  if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
    return { error: NextResponse.json(
      { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์เข้าถึงคิวตรวจสอบยืนยันตัวตน' } },
      { status: 403 }
    ) };
  }

  return { player };
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20') || 20));
    const statusParam = (searchParams.get('status') ?? 'PENDING').toUpperCase();

    if (!VERIFICATION_STATUS_VALUES.includes(statusParam as typeof VERIFICATION_STATUS_VALUES[number])) {
      return NextResponse.json(
        { error: { code: 'INVALID_STATUS', message: `status ต้องเป็นหนึ่งใน ${VERIFICATION_STATUS_VALUES.join(', ')}` } },
        { status: 400 }
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('game_accounts')
      .select('id, player_id, game_name, tag_line, region, evidence_url, rejection_reason, verification_status, created_at, players!inner(athlete_id, display_name)', { count: 'exact' })
      .eq('verification_status', statusParam)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const rows = (data ?? []).map((row) => {
      const { players, ...rest } = row as typeof row & {
        players: { athlete_id: string; display_name: string } | { athlete_id: string; display_name: string }[];
      };
      const playerInfo = Array.isArray(players) ? players[0] : players;
      return {
        ...rest,
        athlete_id: playerInfo?.athlete_id ?? null,
        display_name: playerInfo?.display_name ?? null,
      };
    });

    const total = count ?? rows.length;

    return NextResponse.json({
      data: rows,
      meta: { total, page, limit, total_pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
