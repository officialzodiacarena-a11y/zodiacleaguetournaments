import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateFiatIntentSchema } from '@/types/payments';
import { createOmiseCharge } from '@/lib/payments/omise';

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

    const parseResult = CreateFiatIntentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ผ่านเกณฑ์คัดกรอง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { purpose, method, orderId, amountThb, apAmount, omiseToken } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: existing } = await adminSupabase
      .from('payment_intents')
      .select('id, checkout_url, expires_at')
      .eq('idempotency_key', idempotencyKey)
      .eq('player_id', player.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'คำขอชำระเงินนี้ถูกสร้างไปแล้ว (Idempotent execution)',
        payment_intent_id: existing.id,
        checkout_url: existing.checkout_url,
        expires_at: existing.expires_at,
      });
    }

    let finalAmountThb = amountThb;

    if (purpose === 'ORDER') {
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

    const nowISO = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: intent, error: insertError } = await adminSupabase
      .from('payment_intents')
      .insert({
        player_id: player.id,
        purpose,
        order_id: purpose === 'ORDER' ? orderId : null,
        channel: 'FIAT',
        method,
        amount_thb: finalAmountThb,
        ap_amount: purpose === 'TOP_UP' ? apAmount : null,
        status: 'PENDING',
        provider: 'OMISE',
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

    try {
      const charge = await createOmiseCharge({
        amountThb: finalAmountThb!,
        method,
        omiseToken,
        paymentIntentId: intent.id,
      });

      const { data: updatedIntent, error: updateError } = await adminSupabase
        .from('payment_intents')
        .update({ provider_intent_id: charge.chargeId, checkout_url: charge.checkoutUrl, updated_at: new Date().toISOString() })
        .eq('id', intent.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
      }

      return NextResponse.json(
        {
          success: true,
          payment_intent_id: updatedIntent.id,
          checkout_url: updatedIntent.checkout_url,
          expires_at: updatedIntent.expires_at,
        },
        { status: 201 }
      );
    } catch (omiseError: unknown) {
      const message = omiseError instanceof Error ? omiseError.message : 'Payment provider error';
      await adminSupabase.from('payment_intents').update({ status: 'FAILED', updated_at: new Date().toISOString() }).eq('id', intent.id);
      return NextResponse.json(
        { error: { code: 'PAYMENT_PROVIDER_ERROR', message } },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
