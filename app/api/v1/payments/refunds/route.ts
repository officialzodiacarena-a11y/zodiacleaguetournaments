import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateRefundSchema } from '@/types/payments';
import { refundOmiseCharge } from '@/lib/payments/omise';

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = CreateRefundSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { paymentIntentId, reason } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: intent, error: intentError } = await adminSupabase
      .from('payment_intents')
      .select('id, player_id, purpose, channel, status, amount_thb, ap_amount, provider_intent_id')
      .eq('id', paymentIntentId)
      .single();

    if (intentError || !intent) {
      return NextResponse.json(
        { error: { code: 'PAYMENT_INTENT_NOT_FOUND', message: 'ไม่พบคำขอชำระเงินนี้' } },
        { status: 404 }
      );
    }

    if (intent.player_id !== player.id) {
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('player_id', player.id)
        .is('revoked_at', null)
        .single();

      const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
      if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ขอคืนเงินสำหรับการชำระเงินนี้' } },
          { status: 403 }
        );
      }
    }

    if (intent.status !== 'SUCCEEDED') {
      return NextResponse.json(
        { error: { code: 'INTENT_NOT_SUCCEEDED', message: 'คืนเงินได้เฉพาะรายการที่ชำระเงินสำเร็จแล้วเท่านั้น' } },
        { status: 422 }
      );
    }

    const { data: existing } = await adminSupabase
      .from('refunds')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'รายการคืนเงินนี้ถูกสร้างไปแล้ว (Idempotent execution)',
        refund_id: existing.id,
        status: existing.status,
      });
    }

    if (intent.channel === 'FIAT') {
      try {
        const refundResult = await refundOmiseCharge(intent.provider_intent_id!, intent.amount_thb ?? undefined);

        const { data: refund, error: insertError } = await adminSupabase
          .from('refunds')
          .insert({
            payment_intent_id: intent.id,
            requested_by: player.id,
            channel: 'FIAT',
            amount_thb: intent.amount_thb,
            status: 'PROCESSING',
            provider_refund_id: refundResult.refundId,
            reason,
            idempotency_key: idempotencyKey,
          })
          .select()
          .single();

        if (insertError) {
          return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insertError.message } }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: refund }, { status: 201 });
      } catch (omiseError: unknown) {
        const message = omiseError instanceof Error ? omiseError.message : 'Refund provider error';
        return NextResponse.json({ error: { code: 'REFUND_PROVIDER_ERROR', message } }, { status: 502 });
      }
    }

    // CRYPTO — ไม่รองรับ on-chain refund ตามสเปค T3.5-E01 เครดิตกลับเป็น AP แทน
    // TOP_UP: คืนเท่ากับ ap_amount ที่เคย credit ไปพอดี
    // ORDER: ไม่มี ap_amount บันทึกไว้ ใช้ amount_thb เป็นฐานคำนวณ 1 THB = 1 AP เป็นค่าเริ่มต้น
    const apEquivalent = intent.purpose === 'TOP_UP' ? intent.ap_amount! : Math.round(intent.amount_thb ?? 0);

    const { data: moveResult, error: moveError } = await adminSupabase.rpc('move_ap', {
      p_player_id: intent.player_id,
      p_amount: apEquivalent,
      p_reason: 'REFUND_AP_CREDIT',
      p_idempotency_key: idempotencyKey,
      p_reference_type: 'payment_intent',
      p_reference_id: intent.id,
    });

    if (moveError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: moveError.message } }, { status: 500 });
    }

    const moveResultTyped = moveResult as { success: boolean; error?: string };
    if (!moveResultTyped.success && moveResultTyped.error !== 'DUPLICATE_KEY') {
      return NextResponse.json(
        { error: { code: 'REFUND_AP_CREDIT_FAILED', message: moveResultTyped.error ?? 'เครดิต AP คืนไม่สำเร็จ' } },
        { status: 500 }
      );
    }

    const { data: refund, error: insertError } = await adminSupabase
      .from('refunds')
      .insert({
        payment_intent_id: intent.id,
        requested_by: player.id,
        channel: 'CRYPTO',
        ap_amount: apEquivalent,
        status: 'SUCCEEDED',
        reason: `${reason} (หมายเหตุ: ไม่รองรับการคืนเงินแบบ on-chain — เครดิตเป็น AP จำนวน ${apEquivalent} แทน)`,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insertError.message } }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Crypto ไม่รองรับการคืนเงินแบบ on-chain ระบบเครดิต AP จำนวน ${apEquivalent} ให้แทนแล้ว`,
        data: refund,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
