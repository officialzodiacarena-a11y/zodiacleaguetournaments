import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id } = await params;
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

    const { data: ticket, error } = await supabase
      .from('prediction_tickets')
      .select('id, pool_id, player_id, predicted_team_id, tier, ap_amount, payout_ap, created_at')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: { code: 'TICKET_NOT_FOUND', message: 'ไม่พบตั๋วนี้' } }, { status: 404 });
    }

    if (ticket.player_id !== player.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ไม่ใช่ตั๋วของคุณ' } }, { status: 403 });
    }

    return NextResponse.json({
      ticket_id: ticket.id,
      pool_id: ticket.pool_id,
      predicted_team_id: ticket.predicted_team_id,
      tier: ticket.tier,
      ap_amount: ticket.ap_amount,
      payout_ap: ticket.payout_ap,
      created_at: ticket.created_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
