import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole, MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';
import { CreateStoreVariantSchema } from '@/types/store';

// Adds a variant to an item that already exists — POST /items only accepts
// variants at creation time (min 1, required), so this is the only way to
// add another size/option (e.g. a new jacket size) after the fact.
export async function POST(
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

    const parseResult = CreateStoreVariantSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { name, priceAp, priceThb, stock, availableUntil } = parseResult.data;

    const adminSupabase = createAdminClient();
    const { data: variant, error: insertError } = await adminSupabase
      .from('store_item_variants')
      .insert({
        item_id: itemId,
        name,
        price_ap: priceAp,
        price_thb: priceThb,
        stock,
        available_until: availableUntil ?? null,
      })
      .select()
      .single();

    if (insertError) {
      // Postgres FK violation (23503) — item_id doesn't match any store_items row.
      if (insertError.code === '23503') {
        return NextResponse.json(
          { error: { code: 'ITEM_NOT_FOUND', message: 'ไม่พบไอเทมนี้ในระบบ' } },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insertError.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: variant }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
