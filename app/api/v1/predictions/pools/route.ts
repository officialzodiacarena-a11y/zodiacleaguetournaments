import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('prediction_pools')
      .select('id, match_id, house_fee_percent, total_ap_pool_a, total_ap_pool_b, bonus_pool_ap, status')
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const pools = (data ?? []).map((row) => ({
      pool_id: row.id,
      match_id: row.match_id,
      house_fee_percent: row.house_fee_percent,
      total_ap_pool_a: row.total_ap_pool_a,
      total_ap_pool_b: row.total_ap_pool_b,
      bonus_pool_ap: row.bonus_pool_ap,
      status: row.status,
    }));

    return NextResponse.json({ pools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
