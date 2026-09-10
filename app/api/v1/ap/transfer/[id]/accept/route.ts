import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const { data: escrow, error: escrowError } = await supabase
      .from('ap_escrow')
      .select('id, receiver_id')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) {
      return NextResponse.json({ error: { code: 'ESCROW_NOT_FOUND', message: 'ไม่พบรายการโอนนี้' } }, { status: 404 });
    }

    if (escrow.receiver_id !== player.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'เฉพาะผู้รับเท่านั้นที่กดรับได้' } }, { status: 403 });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('release_escrow_to_receiver', {
      p_escrow_id: escrowId,
      p_auto: false,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; status?: string; ap_received?: number };

    if (!result.success) {
      const status = result.error === 'ESCROW_NOT_PENDING' ? 409 : result.error === 'ESCROW_NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status });
    }

    return NextResponse.json({ escrow_id: escrowId, status: result.status, ap_received: result.ap_received, completed_at: new Date().toISOString() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
