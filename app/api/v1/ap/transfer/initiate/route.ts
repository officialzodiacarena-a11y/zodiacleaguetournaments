import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InitiateTransferSchema } from '@/types/p2p-transfer';
import { verifyTransferToken } from '@/lib/p2p/transferToken';

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

    const parsed = InitiateTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { receiver_id, amount_ap, transfer_token, idempotency_key } = parsed.data;

    const verification = verifyTransferToken(transfer_token);
    if (!verification.valid || verification.payload.sender_id !== player.id) {
      return NextResponse.json({ error: { code: 'TRANSFER_TOKEN_INVALID', message: 'ต้องผ่าน 2FA ก่อน' } }, { status: 401 });
    }

    // Single-use enforcement — this insert fails with TOKEN_ALREADY_USED if
    // the jti was ever consumed before (unique constraint on jti).
    const { data: consumeResult, error: consumeError } = await supabase.rpc('consume_p2p_transfer_token', {
      p_jti: verification.payload.jti,
      p_sender_id: player.id,
    });

    if (consumeError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: consumeError.message } }, { status: 500 });
    }

    const consumed = consumeResult as { success: boolean; error?: string };
    if (!consumed.success) {
      return NextResponse.json({ error: { code: consumed.error, message: 'transfer_token นี้ถูกใช้ไปแล้ว' } }, { status: 409 });
    }

    if (receiver_id === player.id) {
      return NextResponse.json({ error: { code: 'SELF_TRANSFER_FORBIDDEN', message: 'โอนหาตัวเองไม่ได้' } }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('transfer_ap_to_escrow', {
      p_sender_id: player.id,
      p_receiver_id: receiver_id,
      p_amount_ap: amount_ap,
      p_idempotency_key: idempotency_key,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; escrow_id?: string; amount_ap?: number; status?: string; approval_deadline?: string };

    if (!result.success) {
      const statusByError: Record<string, number> = {
        SELF_TRANSFER_FORBIDDEN: 400,
        SENDER_NOT_FOUND: 404,
        RECEIVER_NOT_FOUND: 404,
        RECEIVER_BANNED: 403,
        DAILY_UNVERIFIED_LIMIT_EXCEEDED: 422,
        INSUFFICIENT_AP_BALANCE: 422,
        DUPLICATE_KEY: 409,
      };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 400 });
    }

    return NextResponse.json(
      { escrow_id: result.escrow_id, amount_ap: result.amount_ap, status: result.status, approval_deadline: result.approval_deadline },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
