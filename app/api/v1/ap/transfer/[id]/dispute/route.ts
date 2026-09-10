import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DisputeEscrowSchema } from '@/types/p2p-transfer';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { id: escrowId } = await params;
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

    const parsed = DisputeEscrowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ต้องระบุเหตุผลอย่างน้อย 3 ตัวอักษร' } }, { status: 400 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('dispute_escrow_and_refund', {
      p_escrow_id: escrowId,
      p_sender_id: player.id,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; status?: string; refunded_ap?: number };

    if (!result.success) {
      const statusByError: Record<string, number> = { ESCROW_NOT_FOUND: 404, FORBIDDEN: 403, ESCROW_NOT_PENDING: 409 };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 400 });
    }

    await supabase.from('audit_logs').insert({
      actor_id: player.id,
      action: 'UPDATE',
      entity_type: 'ap_escrow',
      entity_id: escrowId,
      reason: parsed.data.reason,
      after_data: { status: 'DISPUTED' },
    });

    return NextResponse.json({ escrow_id: escrowId, status: result.status, refunded_ap: result.refunded_ap });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
