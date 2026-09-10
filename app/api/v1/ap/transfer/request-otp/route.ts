import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashOtpCode } from '@/lib/p2p/transferToken';

// Not in the abbreviated API contract (which only lists verify-2fa taking an
// otp_code directly) — added because no OTP delivery step exists anywhere
// otherwise. No SMS/email provider exists in this project (verified repo-wide),
// so the code is delivered via the existing in-app `notifications` table as a
// temporary bridge. Swap for real SMS/email before this is trusted with money.
export async function POST() {
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

    const code = String(Math.floor(100000 + Math.random() * 900000));

    const { data: rpcResult, error: rpcError } = await supabase.rpc('issue_p2p_otp_challenge', {
      p_sender_id: player.id,
      p_otp_code_hash: hashOtpCode(code),
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; locked_until?: string; expires_at?: string };
    if (!result.success) {
      return NextResponse.json({ error: { code: result.error, message: 'บัญชีถูกล็อกการโอน AP ชั่วคราว', locked_until: result.locked_until } }, { status: 423 });
    }

    await supabase.from('notifications').insert({
      player_id: player.id,
      type: 'P2P_TRANSFER_OTP',
      title: 'รหัสยืนยันการโอน AP',
      body: `รหัส OTP ของคุณคือ ${code} (หมดอายุใน 5 นาที) — ห้ามบอกรหัสนี้กับผู้อื่น`,
      action_url: null,
    });

    return NextResponse.json({ sent: true, expires_at: result.expires_at }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
