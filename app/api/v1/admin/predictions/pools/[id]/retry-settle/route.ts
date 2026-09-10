import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';
import { SettlePoolSchema } from '@/types/predictions';

// Not in the abbreviated API_Stage2_Phase7.md endpoint table, but explicitly
// named in this session's briefing (`retry-settle`) and required by the
// SETTLEMENT_ERROR recovery flow — settle_prediction_pool() only requires
// status = 'LOCKED', and admin_void_match_and_refund() falls back to LOCKED
// on a stuck pool, but the simplest safe retry is just re-running the same
// settle RPC: SETTLEMENT_ERROR pools stay LOCKED-eligible internally? No —
// settle_prediction_pool() rejects with POOL_NOT_LOCKED unless status is
// exactly 'LOCKED'. So retrying first resets the pool back to LOCKED, then
// re-runs the settlement in one call.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: poolId } = await params;
    const supabase = await createClient();

    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'ต้องแนบ Idempotency-Key header' } }, { status: 400 });
    }

    const guard = await requireAdminRole(supabase, ['ADMIN', 'SUPER_ADMIN']);
    if ('error' in guard) return guard.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = SettlePoolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ต้องระบุ winning_team_id' } }, { status: 400 });
    }

    const { data: pool, error: poolError } = await supabase
      .from('prediction_pools')
      .select('id, status')
      .eq('id', poolId)
      .single();

    if (poolError || !pool) {
      return NextResponse.json({ error: { code: 'POOL_NOT_FOUND', message: 'ไม่พบ pool นี้' } }, { status: 404 });
    }

    if (pool.status !== 'SETTLEMENT_ERROR') {
      return NextResponse.json({ error: { code: 'POOL_NOT_IN_ERROR', message: 'Pool นี้ไม่ได้อยู่ในสถานะ SETTLEMENT_ERROR' } }, { status: 422 });
    }

    // Reset to LOCKED so settle_prediction_pool()'s guard accepts it, then retry.
    await supabase.from('prediction_pools').update({ status: 'LOCKED' }).eq('id', poolId).eq('status', 'SETTLEMENT_ERROR');

    const { data: rpcResult, error: rpcError } = await supabase.rpc('settle_prediction_pool', {
      p_pool_id: poolId,
      p_winning_team_id: parsed.data.winning_team_id,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; status?: string };

    if (!result.success) {
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: 500 });
    }

    await supabase.from('audit_logs').insert({
      actor_id: guard.playerId,
      action: 'UPDATE',
      entity_type: 'prediction_pools',
      entity_id: poolId,
      reason: 'RETRY_SETTLE_AFTER_ERROR',
      after_data: result,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
