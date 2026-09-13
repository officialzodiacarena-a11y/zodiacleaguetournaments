import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { UpdateStoreCategorySchema } from '@/types/store';
import { asUpdate } from '@/types/supabase-helpers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: categoryId } = await params;
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

    const parseResult = UpdateStoreCategorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { name, displayOrder, isActive } = parseResult.data;
    const updatePayload: Record<string, unknown> = {};
    if (name !== undefined) updatePayload.name = name;
    if (displayOrder !== undefined) updatePayload.display_order = displayOrder;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    const adminSupabase = createAdminClient();
    const { data: category, error: updateError } = await adminSupabase
      .from('store_categories')
      .update(asUpdate<'store_categories'>(updatePayload))
      .eq('id', categoryId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    if (!category) {
      return NextResponse.json(
        { error: { code: 'CATEGORY_NOT_FOUND', message: 'ไม่พบหมวดหมู่นี้ในระบบ' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
