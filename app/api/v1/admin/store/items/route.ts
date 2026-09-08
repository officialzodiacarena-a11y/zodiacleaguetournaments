import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateStoreItemSchema } from '@/types/store';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
        { status: 404 }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', player.id)
      .is('revoked_at', null)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์จัดการร้านค้า' } },
        { status: 403 }
      );
    }

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

    const { name, type, description, maxPerPlayer, variants } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: item, error: itemError } = await adminSupabase
      .from('store_items')
      .insert({ name, type, description: description ?? null, max_per_player: maxPerPlayer ?? null })
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

    return NextResponse.json({ success: true, data: { ...item, variants: variantRows } }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
