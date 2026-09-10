import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';
import { VoidMatchSchema } from '@/types/predictions';

// SUPER_ADMIN only — Emergency Void Match. See the migration file's header
// note: this does NOT touch tournament_registrations (undefined scope for a
// single-match void against a whole-tournament entry fee) — it only voids
// the match's own prediction pool + refunds tickets + rolls back jackpot.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'ต้องแนบ Idempotency-Key header' } }, { status: 400 });
    }

    const guard = await requireAdminRole(supabase, ['SUPER_ADMIN']);
    if ('error' in guard) return guard.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = VoidMatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ต้องระบุเหตุผลอย่างน้อย 3 ตัวอักษร' } }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_void_match_and_refund', {
      p_match_id: matchId,
      p_admin_id: guard.playerId,
      p_reason: parsed.data.reason,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; match_id?: string; status?: string; pool_voided?: boolean };

    if (!result.success) {
      const statusByError: Record<string, number> = {
        MATCH_NOT_FOUND: 404,
        MATCH_ALREADY_VOID: 409,
        MATCH_COMPLETED: 422,
        INVALID_MATCH_STATE_FOR_VOID: 422,
      };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 500 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
