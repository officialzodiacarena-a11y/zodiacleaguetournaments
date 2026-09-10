import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BuyTicketSchema } from '@/types/predictions';

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

    const parsed = BuyTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { pool_id, predicted_team_id, tier, ap_amount, idempotency_key } = parsed.data;

    const { data: rpcResult, error: rpcError } = await supabase.rpc('buy_prediction_ticket', {
      p_pool_id: pool_id,
      p_player_id: player.id,
      p_predicted_team_id: predicted_team_id,
      p_tier: tier,
      p_ap_amount: ap_amount,
      p_idempotency_key: idempotency_key,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; ticket_id?: string; pool_id?: string };

    if (!result.success) {
      const statusByError: Record<string, number> = {
        POOL_NOT_FOUND: 404,
        POOL_NOT_OPEN: 422,
        MATCH_ALREADY_LIVE: 422,
        INVALID_TEAM: 400,
        ALREADY_TICKETED: 409,
        DUPLICATE_KEY: 409,
        INSUFFICIENT_AP_BALANCE: 422,
      };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 400 });
    }

    return NextResponse.json({ ticket_id: result.ticket_id, pool_id: result.pool_id }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
