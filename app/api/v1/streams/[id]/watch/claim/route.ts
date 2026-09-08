import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ClaimWatchRewardResult } from '@/types/watch-to-earn';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: streamId } = await params;
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
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดูสตรีม' } },
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

    const adminSupabase = createAdminClient();

    const { data: session, error: sessionError } = await adminSupabase
      .from('watch_sessions')
      .select('id, status')
      .eq('stream_id', streamId)
      .eq('player_id', player.id)
      .in('status', ['ACTIVE', 'CLAIMED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: { code: 'NO_ACTIVE_SESSION', message: 'ไม่พบ watch session ที่รอ claim สำหรับสตรีมนี้' } },
        { status: 404 }
      );
    }

    const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('claim_watch_reward', {
      p_session_id: session.id,
      p_idempotency_key: idempotencyKey,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: { code: 'RPC_FAILED', message: rpcError.message } },
        { status: 500 }
      );
    }

    const result = rpcResult as ClaimWatchRewardResult;

    if (!result.success) {
      if (result.error === 'ALREADY_CLAIMED') {
        return NextResponse.json(
          { error: { code: 'ALREADY_CLAIMED', message: 'Session นี้ถูก claim ไปแล้ว (Idempotent)' } },
          { status: 409 }
        );
      }
      if (result.error === 'SESSION_TOO_RISKY' || result.error === 'ANOMALOUS_SESSION') {
        return NextResponse.json(
          { error: { code: 'SESSION_TOO_RISKY', message: 'Session นี้ถูกตรวจพบความผิดปกติ ไม่สามารถรับ AP ได้' } },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: { code: 'CLAIM_FAILED', message: result.error ?? 'ไม่สามารถ claim รางวัลได้' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ap_awarded: result.ap_awarded,
        capped: result.capped ?? false,
        balance_after: result.balance_after,
        daily_earned: result.daily_earned,
        daily_cap: result.daily_cap,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
