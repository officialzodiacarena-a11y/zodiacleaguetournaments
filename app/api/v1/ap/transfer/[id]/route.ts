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

    // RLS (escrow_self) already restricts this to sender/receiver/admin.
    const { data, error } = await supabase
      .from('ap_escrow')
      .select('id, sender_id, receiver_id, amount_ap, status, approval_deadline, auto_released_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: { code: 'ESCROW_NOT_FOUND', message: 'ไม่พบรายการโอนนี้ หรือคุณไม่มีสิทธิ์เข้าถึง' } }, { status: 404 });
    }

    return NextResponse.json({
      escrow_id: data.id,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      amount_ap: data.amount_ap,
      status: data.status,
      approval_deadline: data.approval_deadline,
      auto_released_at: data.auto_released_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
