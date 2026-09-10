import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VerifyOtpSchema } from '@/types/p2p-transfer';
import { hashOtpCode, issueTransferToken } from '@/lib/p2p/transferToken';

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

    const parsed = VerifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'รหัส OTP ต้องเป็นตัวเลข 6 หลัก' } }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('verify_p2p_otp_challenge', {
      p_sender_id: player.id,
      p_otp_code_hash: hashOtpCode(parsed.data.otp_code),
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; attempts?: number; locked_until?: string };

    if (!result.success) {
      const status = result.error === 'ACCOUNT_LOCKED' ? 423 : result.error === 'OTP_EXPIRED' ? 410 : 400;
      return NextResponse.json({ error: { code: result.error, message: result.error, attempts: result.attempts, locked_until: result.locked_until } }, { status });
    }

    const { token, expiresAt } = issueTransferToken(player.id);

    return NextResponse.json({ verified: true, transfer_token: token, expires_at: expiresAt });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
