import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';

// admin_revert_prediction_pool() — VOID after settle (post-settlement fraud).
// SUPER_ADMIN only, per the spec's escalated-privilege void path.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: poolId } = await params;
    const supabase = await createClient();

    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'ต้องแนบ Idempotency-Key header' } }, { status: 400 });
    }

    const guard = await requireAdminRole(supabase, ['SUPER_ADMIN']);
    if ('error' in guard) return guard.error;

    const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_revert_prediction_pool', {
      p_pool_id: poolId,
      p_admin_id: guard.playerId,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; status?: string };

    if (!result.success) {
      const status = result.error === 'POOL_NOT_SETTLED' ? 422 : result.error === 'POOL_NOT_FOUND' ? 404 : 500;
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
