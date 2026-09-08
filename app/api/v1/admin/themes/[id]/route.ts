import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UpdateThemeSchema } from '@/types/themes';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: themeId } = await params;
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

    const parseResult = UpdateThemeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { colors, typography, assets, customCssVars, isActive, activeFrom, activeUntil, priority } = parseResult.data;

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (colors !== undefined) updatePayload.colors = colors;
    if (typography !== undefined) updatePayload.typography = typography;
    if (assets !== undefined) updatePayload.assets = assets;
    if (customCssVars !== undefined) updatePayload.custom_css_vars = customCssVars;
    if (isActive !== undefined) updatePayload.is_active = isActive;
    if (activeFrom !== undefined) updatePayload.active_from = activeFrom;
    if (activeUntil !== undefined) updatePayload.active_until = activeUntil;
    if (priority !== undefined) updatePayload.priority = priority;

    const adminSupabase = createAdminClient();
    const { data: theme, error: updateError } = await adminSupabase
      .from('brand_themes')
      .update(updatePayload)
      .eq('id', themeId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    if (!theme) {
      return NextResponse.json(
        { error: { code: 'THEME_NOT_FOUND', message: 'ไม่พบธีมนี้ในระบบ' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: theme });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
