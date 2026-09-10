import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WatchHeartbeatSchema } from '@/types/watch-v2';
import { computeNextResetAtBangkok } from '@/lib/watch/nextResetAt';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดูสตรีม' } }, { status: 401 });
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

    const parsed = WatchHeartbeatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ต้องระบุ session_id' } }, { status: 400 });
    }

    const { session_id } = parsed.data;

    const { data: session, error: sessionError } = await supabase
      .from('watch_sessions')
      .select('id, status')
      .eq('id', session_id)
      .eq('player_id', player.id)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: { code: 'SESSION_NOT_FOUND', message: 'ไม่พบ session นี้' } }, { status: 404 });
    }

    if (session.status !== 'ACTIVE') {
      return NextResponse.json({ error: { code: 'STREAM_ENDED', message: 'Session นี้จบไปแล้ว' } }, { status: 422 });
    }

    // Zero DB Write fast path: a plain read-only SELECT is cheap and, for the
    // common repeated-CAP_REACHED case, avoids ever calling the write-capable
    // RPC at all.
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
    const { data: limitRow } = await supabase
      .from('ap_daily_limits')
      .select('ap_earned, daily_cap')
      .eq('player_id', player.id)
      .eq('limit_date', today)
      .maybeSingle();

    if (limitRow && limitRow.ap_earned >= limitRow.daily_cap) {
      return NextResponse.json({
        status: 'CAP_REACHED',
        earned: 0,
        total_today: limitRow.ap_earned,
        daily_cap: limitRow.daily_cap,
        next_reset_at: computeNextResetAtBangkok(),
      });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('credit_watch_v2_heartbeat', {
      p_session_id: session_id,
      p_player_id: player.id,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      status?: 'OK' | 'CAP_REACHED';
      earned?: number;
      total_today?: number;
      daily_cap?: number;
    };

    if (!result.success) {
      const statusByError: Record<string, number> = { SESSION_NOT_FOUND: 404, STREAM_ENDED: 422 };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 500 });
    }

    if (result.status === 'CAP_REACHED') {
      return NextResponse.json({
        status: 'CAP_REACHED',
        earned: 0,
        total_today: result.total_today,
        daily_cap: result.daily_cap,
        next_reset_at: computeNextResetAtBangkok(),
      });
    }

    return NextResponse.json({ status: 'OK', earned: result.earned, total_today: result.total_today, daily_cap: result.daily_cap });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
