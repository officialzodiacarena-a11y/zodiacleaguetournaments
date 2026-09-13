//app/api/v1/admin/earning-rules/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/types/database.types';

type EarningRuleUpdate = Database['public']['Tables']['ap_earning_rules']['Update'];

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    const { data, error } = await supabase
      .from('ap_earning_rules')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'ไม่พบกฎการให้ AP ที่ระบุ' } }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    const body = (await req.json()) as Record<string, unknown>;
    const updatePayload: EarningRuleUpdate = {};

    if (typeof body.name === 'string') updatePayload.name = body.name;
    if (typeof body.code === 'string') updatePayload.code = body.code;
    if (typeof body.ap_amount === 'number') updatePayload.ap_amount = body.ap_amount;
    if (typeof body.min_watch_seconds === 'number') updatePayload.min_watch_seconds = body.min_watch_seconds;
    if (typeof body.max_per_day === 'number' || body.max_per_day === null) updatePayload.max_per_day = body.max_per_day;
    if (typeof body.max_per_stream === 'number') updatePayload.max_per_stream = body.max_per_stream;
    if (typeof body.cooldown_seconds === 'number') updatePayload.cooldown_seconds = body.cooldown_seconds;
    if (typeof body.is_active === 'boolean') updatePayload.is_active = body.is_active;
    if (body.conditions) updatePayload.conditions = body.conditions as unknown as Json;

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('ap_earning_rules')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const guard = await requireAdmin(supabase);
    if (guard.error) return guard.error;

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from('ap_earning_rules')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: { code: 'DELETE_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}