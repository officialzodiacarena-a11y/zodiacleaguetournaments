import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RenewSubscriptionSchema } from '@/types/subscriptions';
import { callWithLockRetry } from '@/lib/billing/retryOnLockTimeout';

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

    const idempotencyHeader = req.headers.get('Idempotency-Key');
    if (!idempotencyHeader) {
      return NextResponse.json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'ต้องแนบ Idempotency-Key header' } }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = RenewSubscriptionSchema.safeParse({ ...(body as Record<string, unknown>), idempotency_key: idempotencyHeader });
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { subscription_id, idempotency_key } = parsed.data;

    // Ownership check: only the subscription's own team leader / player may renew it.
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('id, subscriber_type, team_id, player_id')
      .eq('id', subscription_id)
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'ไม่พบ subscription' } }, { status: 404 });
    }

    if (sub.subscriber_type === 'TEAM') {
      if (!sub.team_id) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ต้องเป็นหัวหน้าทีมของ subscription นี้เท่านั้น' } }, { status: 403 });
      }
      const { data: isLeader } = await supabase.rpc('is_team_leader', { p_team_id: sub.team_id });
      if (!isLeader) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ต้องเป็นหัวหน้าทีมของ subscription นี้เท่านั้น' } }, { status: 403 });
      }
    } else if (sub.player_id !== player.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ไม่ใช่เจ้าของ subscription นี้' } }, { status: 403 });
    }

    const { data: rpcResult, error: rpcError, lockTimedOut } = await callWithLockRetry(async () => {
      const result = await supabase.rpc('renew_subscription_with_ap', {
        p_subscription_id: subscription_id,
        p_player_id: player.id,
        p_idempotency_key: idempotency_key,
      });
      return { data: result.data, error: result.error };
    });

    if (lockTimedOut) {
      return NextResponse.json({ error: { code: 'LOCK_TIMEOUT', message: 'ระบบกำลังประมวลผลรายการอื่นอยู่ กรุณาลองใหม่อีกครั้ง' } }, { status: 409 });
    }

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      subscription_id?: string;
      new_valid_until?: string;
      ap_deducted?: number;
      current_status?: string;
      current_balance?: number;
      requested?: number;
    };

    if (!result.success) {
      if (result.error === 'DUPLICATE_KEY') {
        return NextResponse.json({ error: { code: 'DUPLICATE_KEY', message: 'รายการนี้เคยถูกประมวลผลไปแล้ว (Idempotency Key Blocked)' } }, { status: 409 });
      }
      if (result.error === 'INSUFFICIENT_AP_BALANCE') {
        return NextResponse.json(
          { error: { code: 'INSUFFICIENT_AP_BALANCE', message: 'AP ไม่เพียงพอสำหรับการต่ออายุ', details: { current_balance: result.current_balance, requested: result.requested } } },
          { status: 422 }
        );
      }
      return NextResponse.json({ error: { code: result.error ?? 'RENEW_FAILED', message: result.error ?? 'ไม่สามารถต่ออายุได้' } }, { status: 400 });
    }

    return NextResponse.json({
      subscription_id: result.subscription_id,
      new_valid_until: result.new_valid_until,
      ap_deducted: result.ap_deducted,
      current_status: result.current_status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
