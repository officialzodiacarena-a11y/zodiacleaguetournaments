import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';
import { SettlePoolSchema } from '@/types/predictions';

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

    const { data: rpcResult, error: rpcError } = await supabase.rpc('settle_prediction_pool', {
      p_pool_id: poolId,
      p_winning_team_id: parsed.data.winning_team_id,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; status?: string; total_pool?: number; house_fee_burned?: number; net_distributed?: number; carried_to_jackpot?: number };

    if (!result.success) {
      const status = result.error === 'POOL_NOT_LOCKED' ? 422 : result.error === 'POOL_NOT_FOUND' ? 404 : 500;
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status });
    }

    await supabase.from('audit_logs').insert({
      actor_id: guard.playerId,
      action: 'UPDATE',
      entity_type: 'prediction_pools',
      entity_id: poolId,
      reason: `SETTLE_${result.status}`,
      after_data: result,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
