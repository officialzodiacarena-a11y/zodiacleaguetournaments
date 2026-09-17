// app/api/v1/store/coupons/verify/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VerifyCouponSchema } from '@/types/sponsor';

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON ไม่ถูกต้อง' } }, { status: 400 });
    }

    const parseResult = VerifyCouponSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { code, purchase_amount_ap, idempotency_key } = parseResult.data;

    const { data: rpcResult, error: rpcError } = await supabase.rpc('verify_and_redeem_partner_coupon', {
      p_player_id: player.id,
      p_coupon_code: code,
      p_purchase_amount_ap: purchase_amount_ap,
      p_idempotency_key: idempotency_key,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; [key: string]: unknown };

    if (!result.success) {
      return NextResponse.json({ error: { code: result.error ?? 'COUPON_REDEEM_FAILED', message: result.error ?? 'ไม่สามารถใช้คูปองนี้ได้' } }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
