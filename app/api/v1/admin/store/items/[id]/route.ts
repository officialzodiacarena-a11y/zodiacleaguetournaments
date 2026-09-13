import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { UpdateStoreItemSchema } from '@/types/store';
import { asUpdate } from '@/types/supabase-helpers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: itemId } = await params;
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

    const parseResult = UpdateStoreItemSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { name, description, maxPerPlayer, isActive } = parseResult.data;

    const updatePayload: Record<string, unknown> = {};
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (maxPerPlayer !== undefined) updatePayload.max_per_player = maxPerPlayer;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    const adminSupabase = createAdminClient();
    const { data: item, error: updateError } = await adminSupabase
      .from('store_items')
      .update(asUpdate<'store_items'>(updatePayload))
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json(
        { error: { code: 'ITEM_NOT_FOUND', message: 'ไม่พบไอเทมนี้ในระบบ' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}

// store_item_variants.item_id has ON DELETE CASCADE (20260908130000_t34,
// line 51) so deleting the item removes its variants automatically — no
// separate variant cleanup needed here.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: itemId } = await params;
    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    const adminSupabase = createAdminClient();
    const { data: item, error: deleteError } = await adminSupabase
      .from('store_items')
      .delete()
      .eq('id', itemId)
      .select('id')
      .maybeSingle();

    if (deleteError) {
      return NextResponse.json({ error: { code: 'DELETE_FAILED', message: deleteError.message } }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json(
        { error: { code: 'ITEM_NOT_FOUND', message: 'ไม่พบไอเทมนี้ในระบบ' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id: item.id } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
