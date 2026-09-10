import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
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

    // RLS (tickets_self) also restricts this to the ticket owner.
    const { data, error } = await supabase
      .from('prediction_tickets')
      .select('id, pool_id, predicted_team_id, tier, ap_amount, payout_ap, created_at')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const tickets = (data ?? []).map((row) => ({
      ticket_id: row.id,
      pool_id: row.pool_id,
      predicted_team_id: row.predicted_team_id,
      tier: row.tier,
      ap_amount: row.ap_amount,
      payout_ap: row.payout_ap,
      created_at: row.created_at,
    }));

    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
