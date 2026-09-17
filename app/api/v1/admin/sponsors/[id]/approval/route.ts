// app/api/v1/admin/sponsors/[id]/approval/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';
import { SponsorApprovalSchema, SponsorIdParamSchema } from '@/types/sponsor';

// การอนุมัติ/ระงับสปอนเซอร์เป็น Quality Gate ระดับสูงกว่าการจัดการ catalog
// ทั่วไป — จำกัดเฉพาะ SUPER_ADMIN/ADMIN เท่านั้น ไม่รวม MARKETPLACE_ADMIN
// (ตาม comment ใน lib/admin/requireAdminRole.ts ที่ห้ามขยายสิทธิ์
// MARKETPLACE_ADMIN ออกนอกขอบเขต catalog/categories/shipments)
const SPONSOR_APPROVAL_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const idValidation = SponsorIdParamSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      return NextResponse.json({ error: { code: 'INVALID_ID', message: 'รูปแบบ Sponsor ID ไม่ถูกต้อง' } }, { status: 400 });
    }
    const sponsorId = idValidation.data;

    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, SPONSOR_APPROVAL_ROLES);
    if ('error' in gate) return gate.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON ไม่ถูกต้อง' } }, { status: 400 });
    }

    const parseResult = SponsorApprovalSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { status, rejection_reason } = parseResult.data;
    const adminSupabase = createAdminClient();

    const { data: updated, error } = await adminSupabase
      .from('sponsors')
      .update({
        status,
        approved_by: gate.playerId,
        rejection_reason: status === 'REJECTED' ? rejection_reason || null : null,
        is_active: status === 'APPROVED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sponsorId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: error.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: gate.playerId,
      action: 'UPDATE',
      entity_type: 'sponsors',
      entity_id: sponsorId,
      reason: `Sponsor approval status -> ${status}: ${updated.company_name}`,
      after_data: updated,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
