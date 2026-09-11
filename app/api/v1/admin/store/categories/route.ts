import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { CreateStoreCategorySchema } from '@/types/store';

// Admin listing includes inactive categories too — public GET /api/v1/store/categories
// filters those out for the storefront.
export async function GET() {
  try {
    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    const { data, error } = await supabase
      .from('store_categories')
      .select('id, name, slug, parent_id, partner_brand, icon_url, display_order, is_active')
      .order('display_order', { ascending: true });

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

    const parseResult = CreateStoreCategorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { name, slug, parentId, partnerBrand, iconUrl, displayOrder } = parseResult.data;

    const adminSupabase = createAdminClient();
    const { data: category, error: insertError } = await adminSupabase
      .from('store_categories')
      .insert({
        name,
        slug,
        parent_id: parentId ?? null,
        partner_brand: partnerBrand ?? null,
        icon_url: iconUrl ?? null,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: { code: 'SLUG_TAKEN', message: 'slug นี้ถูกใช้แล้ว' } },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insertError.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
