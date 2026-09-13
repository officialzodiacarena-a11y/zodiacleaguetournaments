import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateEarningRuleSchema } from '@/types/watch-to-earn';
import type { Database, Json } from '@/types/database.types';

type ApEarningRuleInsert = Database['public']['Tables']['ap_earning_rules']['Insert'];

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
      { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์จัดการกติกาการให้ AP' } },
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
    const isActiveParam = searchParams.get('is_active');

    let query = supabase.from('ap_earning_rules').select('*').order('created_at', { ascending: false });
    if (isActiveParam !== null) {
      query = query.eq('is_active', isActiveParam === 'true');
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = CreateEarningRuleSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { name, apPerInterval, intervalSeconds, dailyCapAp, maxSessionMinutes, isActive } = parseResult.data;

    const insertPayload: ApEarningRuleInsert = {
      code: name.trim().toLowerCase().replace(/\s+/g, '_'),
      name,
      reason: 'WATCH_REWARD' as unknown as Database['public']['Tables']['ap_earning_rules']['Insert']['reason'],
      ap_amount: apPerInterval,
      min_watch_seconds: intervalSeconds,
      min_watch_percent: 0,
      max_per_day: dailyCapAp ?? null,
      max_per_stream: 0,
      cooldown_seconds: 0,
      is_active: isActive,
      conditions: {
        max_session_minutes: maxSessionMinutes ?? null,
      } as unknown as Json,
    };

    const adminSupabase = createAdminClient();
    const { data: rule, error: insertError } = await adminSupabase
      .from('ap_earning_rules')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insertError.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}