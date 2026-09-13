import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { UpdateShipmentSchema } from '@/types/store';
import { asUpdate } from '@/types/supabase-helpers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: shipmentId } = await params;
    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = UpdateShipmentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { trackingNumber, carrier, status } = parseResult.data;

    const updatePayload: Record<string, unknown> = {};
    if (trackingNumber !== undefined) updatePayload.tracking_number = trackingNumber;
    if (carrier !== undefined) updatePayload.carrier = carrier;
    if (status !== undefined) {
      updatePayload.status = status;
      if (status === 'SHIPPED') updatePayload.shipped_at = new Date().toISOString();
    }

    const adminSupabase = createAdminClient();
    const { data: shipment, error: updateError } = await adminSupabase
      .from('shipments')
      .update(asUpdate<'shipments'>(updatePayload))
      .eq('id', shipmentId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    if (!shipment) {
      return NextResponse.json(
        { error: { code: 'SHIPMENT_NOT_FOUND', message: 'ไม่พบข้อมูลการจัดส่งนี้' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: shipment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
