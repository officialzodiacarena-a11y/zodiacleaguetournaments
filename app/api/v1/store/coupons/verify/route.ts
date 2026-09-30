// app/api/v1/store/coupons/verify/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { VerifyCouponSchema } from '@/types/sponsor';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`coupon_preview:${user.id}`, 5, 60);
    if (!rateLimit.ok) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' } },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
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

    const { code, storefront, paymentMethod, subtotal } = parseResult.data;

    const { data: rpcResult, error: rpcError } = await supabase.rpc('preview_store_coupon' as never, {
      p_code: code,
      p_storefront_slug: storefront,
      p_payment_method: paymentMethod,
      p_subtotal: subtotal,
    } as never);

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as unknown as { success: boolean; error?: string; discount_amount?: number; discount_currency?: string; title?: string };

    if (!result.success) {
      return NextResponse.json({ error: { code: result.error ?? 'COUPON_INVALID', message: 'ใช้คูปองนี้ไม่ได้' } }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { discount_amount: result.discount_amount, discount_currency: result.discount_currency, title: result.title },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
