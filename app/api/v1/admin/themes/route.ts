import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateThemeSchema } from '@/types/themes';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scopeTypeFilter = searchParams.get('scope_type');
    const isActiveFilter = searchParams.get('is_active');

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
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
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
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์จัดการธีม' } },
        { status: 403 }
      );
    }

    const adminSupabase = createAdminClient();
    let query = adminSupabase.from('brand_themes').select('*').order('scope_type').order('priority', { ascending: false });

    if (scopeTypeFilter) query = query.eq('scope_type', scopeTypeFilter);
    if (isActiveFilter !== null) query = query.eq('is_active', isActiveFilter === 'true');

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
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
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์จัดการธีม' } },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = CreateThemeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const {
      code, name, scopeType, scopeId, colors, typography, assets, customCssVars,
      priority, isActive, activeFrom, activeUntil,
    } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: existingCode } = await adminSupabase
      .from('brand_themes')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existingCode) {
      return NextResponse.json(
        { error: { code: 'CODE_ALREADY_EXISTS', message: `code "${code}" ถูกใช้ไปแล้ว` } },
        { status: 409 }
      );
    }

    const { data: theme, error: insertError } = await adminSupabase
      .from('brand_themes')
      .insert({
        code,
        name,
        scope_type: scopeType,
        scope_id: scopeType === 'GLOBAL' ? null : scopeId,
        colors,
        typography,
        assets,
        custom_css_vars: customCssVars,
        priority,
        is_active: isActive,
        active_from: activeFrom ?? new Date().toISOString(),
        active_until: activeUntil ?? null,
        created_by: player.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insertError.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: theme }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
