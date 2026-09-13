import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateCryptoIntentSchema } from '@/types/payments';
import { getTokenToThbRate } from '@/lib/payments/cryptoRate';

export async function POST(req: Request) {
  try {
    const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'ต้องแนบ Idempotency-Key header มาด้วย' } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' } },
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = CreateCryptoIntentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ผ่านเกณฑ์คัดกรอง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { purpose, orderId, tokenSymbol, apAmount, amountThb } = parseResult.data;

    const toAddress = process.env.BSC_PAYMENT_CONTRACT_ADDRESS;
    if (!toAddress) {
      return NextResponse.json(
        { error: { code: 'CONFIG_ERROR', message: 'ยังไม่ได้ตั้งค่าที่อยู่ Smart Contract สำหรับรับชำระเงิน' } },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: existing } = await adminSupabase
      .from('payment_intents')
      .select('id, expires_at, crypto_payments(to_address, amount_token, token_symbol)')
      .eq('idempotency_key', idempotencyKey)
      .eq('player_id', player.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'คำขอชำระเงินนี้ถูกสร้างไปแล้ว (Idempotent execution)',
        payment_intent_id: existing.id,
        expires_at: existing.expires_at,
      });
    }

    let finalAmountThb = amountThb;

    if (purpose === 'ORDER') {
      if (!orderId) {
        return NextResponse.json(
          { error: { code: 'ORDER_NOT_FOUND', message: 'ไม่พบคำสั่งซื้อนี้' } },
          { status: 404 }
        );
      }
      const { data: order, error: orderError } = await adminSupabase
        .from('orders')
        .select('id, player_id, status, total_price_thb')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: { code: 'ORDER_NOT_FOUND', message: 'ไม่พบคำสั่งซื้อนี้' } },
          { status: 404 }
        );
      }

      if (order.player_id !== player.id) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ชำระเงินสำหรับคำสั่งซื้อนี้' } },
          { status: 403 }
        );
      }

      if (order.status !== 'PENDING') {
        return NextResponse.json(
          { error: { code: 'ORDER_NOT_PENDING', message: 'คำสั่งซื้อนี้ไม่ได้อยู่ในสถานะรอชำระเงิน' } },
          { status: 409 }
        );
      }

      finalAmountThb = order.total_price_thb;
    }

    let rateToThb: number;
    try {
      rateToThb = await getTokenToThbRate(tokenSymbol);
    } catch (rateError: unknown) {
      const message = rateError instanceof Error ? rateError.message : 'ดึงอัตราแลกเปลี่ยนไม่สำเร็จ';
      return NextResponse.json({ error: { code: 'RATE_LOOKUP_FAILED', message } }, { status: 502 });
    }

    const amountToken = finalAmountThb! / rateToThb;
    const nowISO = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: intent, error: insertError } = await adminSupabase
      .from('payment_intents')
      .insert({
        player_id: player.id,
        purpose,
        order_id: purpose === 'ORDER' ? orderId : null,
        channel: 'CRYPTO',
        amount_thb: finalAmountThb,
        ap_amount: purpose === 'TOP_UP' ? apAmount : null,
        status: 'PENDING',
        provider: 'BSC',
        idempotency_key: idempotencyKey,
        expires_at: expiresAt,
        created_at: nowISO,
      })
      .select()
      .single();

    if (insertError || !intent) {
      return NextResponse.json(
        { error: { code: 'INSERT_FAILED', message: insertError?.message ?? 'สร้างคำขอชำระเงินไม่สำเร็จ' } },
        { status: 500 }
      );
    }

    const { data: cryptoPayment, error: cryptoInsertError } = await adminSupabase
      .from('crypto_payments')
      .insert({
        payment_intent_id: intent.id,
        token_symbol: tokenSymbol.toUpperCase(),
        to_address: toAddress,
        amount_token: amountToken,
        rate_to_thb: rateToThb,
        rate_locked_at: nowISO,
      })
      .select()
      .single();

    if (cryptoInsertError) {
      await adminSupabase.from('payment_intents').update({ status: 'FAILED' }).eq('id', intent.id);
      return NextResponse.json(
        { error: { code: 'INSERT_FAILED', message: cryptoInsertError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payment_intent_id: intent.id,
        to_address: cryptoPayment.to_address,
        amount_display: Number(cryptoPayment.amount_token),
        token_symbol: cryptoPayment.token_symbol,
        expires_at: intent.expires_at,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
