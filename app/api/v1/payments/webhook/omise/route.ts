import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyHmacSignature } from '@/lib/payments/webhookAuth';

interface OmiseChargeEvent {
  key?: string;
  data?: {
    id?: string;
    status?: string;
  };
}

// Internal endpoint — ไม่มี auth header อื่นนอกจาก HMAC signature ตาม spec T3.5-B01
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-omise-signature') || req.headers.get('X-Omise-Signature');

    if (!verifyHmacSignature(rawBody, signature, process.env.OMISE_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: { code: 'INVALID_SIGNATURE', message: 'HMAC signature ไม่ถูกต้อง' } }, { status: 401 });
    }

    let event: OmiseChargeEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } }, { status: 400 });
    }

    const chargeId = event.data?.id;
    const chargeStatus = event.data?.status;

    if (!chargeId) {
      // Event ที่ไม่เกี่ยวกับ charge — ตอบ 200 เพื่อไม่ให้ Omise retry ซ้ำ
      return NextResponse.json({ received: true });
    }

    const adminSupabase = createAdminClient();

    const { data: intent, error: findError } = await adminSupabase
      .from('payment_intents')
      .select('id, status')
      .eq('provider_intent_id', chargeId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: findError.message } }, { status: 500 });
    }

    if (!intent) {
      console.error(`[webhook/omise] payment_intent not found for charge ${chargeId}`);
      return NextResponse.json({ received: true, matched: false });
    }

    if (chargeStatus === 'successful' || event.key === 'charge.complete') {
      const { data: settleResult, error: rpcError } = await adminSupabase.rpc('settle_payment_intent', {
        p_payment_intent_id: intent.id,
      });

      if (rpcError) {
        console.error(`[webhook/omise] settle_payment_intent failed for ${intent.id}: ${rpcError.message}`);
        return NextResponse.json({ error: { code: 'SETTLE_FAILED', message: rpcError.message } }, { status: 500 });
      }

      return NextResponse.json({ received: true, settled: settleResult });
    }

    if (chargeStatus === 'failed' || chargeStatus === 'expired') {
      if (intent.status === 'PENDING') {
        await adminSupabase
          .from('payment_intents')
          .update({ status: 'FAILED', updated_at: new Date().toISOString() })
          .eq('id', intent.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error(`[webhook/omise] ${message}`);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
