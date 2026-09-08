import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CryptoWebhookSchema } from '@/types/payments';

export async function POST(req: Request) {
  try {
    const internalKey = req.headers.get('x-internal-key') || req.headers.get('X-Internal-Key');
    if (!process.env.CRYPTO_WEBHOOK_INTERNAL_KEY || internalKey !== process.env.CRYPTO_WEBHOOK_INTERNAL_KEY) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'X-Internal-Key ไม่ถูกต้อง' } }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } }, { status: 400 });
    }

    const parseResult = CryptoWebhookSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ผ่านเกณฑ์คัดกรอง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { paymentIntentId, txHash, blockNumber, confirmations, isReverted } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: cryptoPayment, error: findError } = await adminSupabase
      .from('crypto_payments')
      .select('*')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: findError.message } }, { status: 500 });
    }

    if (!cryptoPayment) {
      return NextResponse.json(
        { error: { code: 'CRYPTO_PAYMENT_NOT_FOUND', message: 'ไม่พบ crypto_payments ของ payment_intent นี้' } },
        { status: 404 }
      );
    }

    // Chain reorg — set is_reverted แล้วปล่อยให้ trigger trg_crypto_revert จัดการ clawback เอง
    if (isReverted) {
      const { error: revertError } = await adminSupabase
        .from('crypto_payments')
        .update({ is_reverted: true, updated_at: new Date().toISOString() })
        .eq('id', cryptoPayment.id);

      if (revertError) {
        return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: revertError.message } }, { status: 500 });
      }

      return NextResponse.json({ received: true, reverted: true });
    }

    if (!txHash) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'txHash จำเป็นเมื่อไม่ใช่ reorg event' } },
        { status: 400 }
      );
    }

    // Idempotency: กัน tx_hash ถูกใช้ซ้ำข้าม payment_intent
    const { data: conflicting } = await adminSupabase
      .from('crypto_payments')
      .select('id, payment_intent_id')
      .eq('tx_hash', txHash)
      .maybeSingle();

    if (conflicting && conflicting.payment_intent_id !== paymentIntentId) {
      return NextResponse.json(
        { error: { code: 'TX_HASH_ALREADY_USED', message: 'tx_hash นี้ถูกใช้กับ payment_intent อื่นไปแล้ว' } },
        { status: 409 }
      );
    }

    const { error: updateError } = await adminSupabase
      .from('crypto_payments')
      .update({
        tx_hash: txHash,
        block_number: blockNumber ?? cryptoPayment.block_number,
        confirmations: confirmations ?? cryptoPayment.confirmations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cryptoPayment.id);

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    const effectiveConfirmations = confirmations ?? cryptoPayment.confirmations;
    const requiredConfirms = cryptoPayment.required_confirms;

    if (!cryptoPayment.is_confirmed && effectiveConfirmations >= requiredConfirms) {
      await adminSupabase
        .from('crypto_payments')
        .update({ is_confirmed: true, updated_at: new Date().toISOString() })
        .eq('id', cryptoPayment.id);

      const { data: settleResult, error: rpcError } = await adminSupabase.rpc('settle_payment_intent', {
        p_payment_intent_id: paymentIntentId,
      });

      if (rpcError) {
        console.error(`[webhook/crypto] settle_payment_intent failed for ${paymentIntentId}: ${rpcError.message}`);
        return NextResponse.json({ error: { code: 'SETTLE_FAILED', message: rpcError.message } }, { status: 500 });
      }

      return NextResponse.json({ received: true, confirmed: true, settled: settleResult });
    }

    return NextResponse.json({ received: true, confirmed: false, confirmations: effectiveConfirmations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error(`[webhook/crypto] ${message}`);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
