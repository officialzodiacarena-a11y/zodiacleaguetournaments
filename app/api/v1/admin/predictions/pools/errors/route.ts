import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';

export async function GET() {
  try {
    const supabase = await createClient();

    const guard = await requireAdminRole(supabase, ['ADMIN', 'SUPER_ADMIN']);
    if ('error' in guard) return guard.error;

    const { data, error } = await supabase
      .from('prediction_pools')
      .select('id, match_id, status, total_ap_pool_a, total_ap_pool_b, updated_at')
      .eq('status', 'SETTLEMENT_ERROR')
      .order('updated_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: error.message } }, { status: 500 });
    }

    const nowMs = Date.now();
    const pools = (data ?? []).map((row) => ({
      pool_id: row.id,
      match_id: row.match_id,
      status: row.status,
      total_ap_pool_a: row.total_ap_pool_a,
      total_ap_pool_b: row.total_ap_pool_b,
      stuck_since: row.updated_at,
      stuck_minutes: Math.floor((nowMs - new Date(row.updated_at).getTime()) / 60000),
    }));

    return NextResponse.json({ pools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
