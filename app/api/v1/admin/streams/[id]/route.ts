import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UpdateStreamSchema } from '@/types/watch-to-earn';
import { asUpdate } from '@/types/supabase-helpers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: streamId } = await params;
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
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์จัดการสตรีม' } },
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

    const parseResult = UpdateStreamSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { status, earningRuleId, apBudgetTotal } = parseResult.data;

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updatePayload.status = status;
    if (earningRuleId !== undefined) updatePayload.earning_rule_id = earningRuleId;
    if (apBudgetTotal !== undefined) updatePayload.ap_budget_total = apBudgetTotal;

    const adminSupabase = createAdminClient();

    const { data: stream, error: updateError } = await adminSupabase
      .from('streams')
      .update(asUpdate<'streams'>(updatePayload))
      .eq('id', streamId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      );
    }

    if (!stream) {
      return NextResponse.json(
        { error: { code: 'STREAM_NOT_FOUND', message: 'ไม่พบสตรีมนี้ในระบบ' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: stream });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
