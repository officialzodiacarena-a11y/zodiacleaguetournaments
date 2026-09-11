import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { UpdateStoreVariantSchema } from '@/types/store';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: variantId } = await params;
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

    const parseResult = UpdateStoreVariantSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { name, priceAp, priceThb, stock, isActive, availableUntil } = parseResult.data;

    const updatePayload: Record<string, unknown> = {};
    if (name !== undefined) updatePayload.name = name;
    if (priceAp !== undefined) updatePayload.price_ap = priceAp;
    if (priceThb !== undefined) updatePayload.price_thb = priceThb;
    if (stock !== undefined) updatePayload.stock = stock;
    if (isActive !== undefined) updatePayload.is_active = isActive;
    if (availableUntil !== undefined) updatePayload.available_until = availableUntil;

    const adminSupabase = createAdminClient();
    const { data: variant, error: updateError } = await adminSupabase
      .from('store_item_variants')
      .update(updatePayload)
      .eq('id', variantId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    if (!variant) {
      return NextResponse.json(
        { error: { code: 'VARIANT_NOT_FOUND', message: 'ไม่พบ variant นี้ในระบบ' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: variant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
