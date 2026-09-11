import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { CreateStoreItemSchema, itemTypeToType } from '@/types/store';

// Admin catalog listing — includes inactive items, unlike the public
// GET /api/v1/store/items (which also hides items with zero live variants).
export async function GET() {
  try {
    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, MARKETPLACE_ADMIN_ROLES);
    if ('error' in gate) return gate.error;

    const { data, error } = await supabase
      .from('store_items')
      .select(
        'id, name, type, description, max_per_player, is_active, category_id, item_type, partner_brand, created_at, store_item_variants(id, item_id, name, price_ap, price_thb, stock, reserved_stock, is_active, available_until)'
      )
      .order('created_at', { ascending: false });

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

    const parseResult = CreateStoreItemSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { name, type, description, maxPerPlayer, categoryId, itemType, partnerBrand, variants } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: item, error: itemError } = await adminSupabase
      .from('store_items')
      .insert({
        name,
        type: type ?? itemTypeToType(itemType),
        description: description ?? null,
        max_per_player: maxPerPlayer ?? null,
        category_id: categoryId ?? null,
        item_type: itemType ?? null,
        partner_brand: partnerBrand ?? null,
      })
      .select()
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: { code: 'INSERT_FAILED', message: itemError?.message ?? 'สร้างไอเทมไม่สำเร็จ' } },
        { status: 500 }
      );
    }

    const { data: variantRows, error: variantError } = await adminSupabase
      .from('store_item_variants')
      .insert(
        variants.map((v) => ({
          item_id: item.id,
          name: v.name,
          price_ap: v.priceAp,
          price_thb: v.priceThb,
          stock: v.stock,
          available_until: v.availableUntil ?? null,
        }))
      )
      .select();

    if (variantError) {
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: variantError.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { ...item, store_item_variants: variantRows ?? [] } }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
