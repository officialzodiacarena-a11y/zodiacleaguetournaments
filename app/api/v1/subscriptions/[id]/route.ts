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

    // RLS (sub_self / sub_admin) already restricts this to the owner or an admin.
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, plan_code, current_status, valid_until, grace_until, auto_renew_with_ap, subscriber_type, team_id, player_id')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'ไม่พบ subscription หรือคุณไม่มีสิทธิ์เข้าถึง' } }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
