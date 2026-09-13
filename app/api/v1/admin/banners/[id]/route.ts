// app/api/v1/admin/banners/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { UpdateBannerSchema, BannerIdParamSchema } from '@/types/sponsor';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const idValidation = BannerIdParamSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: { code: 'INVALID_ID', message: 'รูปแบบ Banner ID ไม่ถูกต้อง' } }, { status: 400 });
    }
    const bannerId = idValidation.data;

    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON ไม่ถูกต้อง' } }, { status: 400 });
    }

    const parseResult = UpdateBannerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const adminSupabase = createAdminClient();

    const { data: updated, error } = await adminSupabase
      .from('sponsor_banners')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bannerId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: error.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: gate.playerId,
      action: 'UPDATE',
      entity_type: 'sponsor_banners',
      entity_id: bannerId,
      reason: `Update sponsor banner: ${updated.title}`,
      after_data: updated,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const idValidation = BannerIdParamSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: { code: 'INVALID_ID', message: 'รูปแบบ Banner ID ไม่ถูกต้อง' } }, { status: 400 });
    }
    const bannerId = idValidation.data;

    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    const adminSupabase = createAdminClient();

    const { data: deleted, error } = await adminSupabase
      .from('sponsor_banners')
      .delete()
      .eq('id', bannerId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'DELETE_FAILED', message: error.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: gate.playerId,
      action: 'DELETE',
      entity_type: 'sponsor_banners',
      entity_id: bannerId,
      reason: `Delete sponsor banner: ${deleted?.title || bannerId}`,
      before_data: deleted,
    });

    return NextResponse.json({ success: true, message: 'ลบแบนเนอร์สำเร็จ' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}