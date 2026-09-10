import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CheckoutSubscriptionSchema } from '@/types/subscriptions';

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

    const parsed = CheckoutSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { plan_code, subscriber_type, subscriber_id, idempotency_key } = parsed.data;

    if (subscriber_type === 'TEAM') {
      const { data: isLeader } = await supabase.rpc('is_team_leader', { p_team_id: subscriber_id });
      if (!isLeader) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ต้องเป็นหัวหน้าทีม (Captain/Manager/Owner) เท่านั้น' } }, { status: 403 });
      }
    } else if (subscriber_id !== player.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ไม่สามารถสมัคร Athlete Pass แทนผู้อื่นได้' } }, { status: 403 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_subscription_invoice', {
      p_plan_code: plan_code,
      p_subscriber_type: subscriber_type,
      p_subscriber_id: subscriber_id,
      p_idempotency_key: idempotency_key,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; invoice_id?: string; amount?: number; currency?: string; expires_at?: string };

    if (!result.success) {
      const status = result.error === 'ALREADY_SUBSCRIBED' ? 409 : 400;
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status });
    }

    return NextResponse.json({
      invoice_id: result.invoice_id,
      amount: result.amount,
      currency: result.currency,
      expires_at: result.expires_at,
      payment_url: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
