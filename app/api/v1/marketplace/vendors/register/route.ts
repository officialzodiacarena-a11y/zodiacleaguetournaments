import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RegisterVendorSchema } from '@/types/marketplace';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = RegisterVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { shop_name, description, team_id } = parsed.data;

    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .eq('player_id', player.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: { code: 'ALREADY_VENDOR', message: 'คุณมีร้านค้าอยู่แล้ว' } }, { status: 409 });
    }

    if (team_id) {
      const { data: isLeader } = await supabase.rpc('is_team_leader', { p_team_id: team_id });
      if (!isLeader) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ต้องเป็นหัวหน้าทีมของทีมนี้เท่านั้นจึงจะเปิด Official Team Store ได้' } }, { status: 403 });
      }
    }

    const { data: vendor, error: insertError } = await supabase
      .from('vendors')
      .insert({ player_id: player.id, team_id: team_id ?? null, shop_name, description: description ?? null })
      .select('id, shop_name, concurrent_slot_limit, monthly_listing_count, monthly_reset_at')
      .single();

    if (insertError) {
      const code = insertError.code === '23503' ? 'TEAM_NOT_FOUND' : 'INSERT_FAILED';
      return NextResponse.json({ error: { code, message: insertError.message } }, { status: code === 'TEAM_NOT_FOUND' ? 400 : 500 });
    }

    return NextResponse.json(
      {
        vendor_id: vendor.id,
        shop_name: vendor.shop_name,
        concurrent_slot_limit: vendor.concurrent_slot_limit,
        monthly_listing_count: vendor.monthly_listing_count,
        monthly_reset_at: vendor.monthly_reset_at,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
