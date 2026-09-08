import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApprovePrizePayoutSchema, isValidPrizePayoutTransition } from '@/types/payments';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: payoutId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
        { status: 404 }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', admin.id)
      .is('revoked_at', null)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์อนุมัติการจ่ายเงินรางวัล' } },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = ApprovePrizePayoutSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { status: nextStatus } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: payout, error: fetchError } = await adminSupabase
      .from('prize_payouts')
      .select('id, status')
      .eq('id', payoutId)
      .single();

    if (fetchError || !payout) {
      return NextResponse.json(
        { error: { code: 'PAYOUT_NOT_FOUND', message: 'ไม่พบรายการจ่ายเงินรางวัลนี้' } },
        { status: 404 }
      );
    }

    if (!isValidPrizePayoutTransition(payout.status, nextStatus)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TRANSITION',
            message: `ไม่สามารถเปลี่ยนสถานะจาก ${payout.status} ไปเป็น ${nextStatus} ได้`,
          },
        },
        { status: 409 }
      );
    }

    const nowISO = new Date().toISOString();
    const updatePayload: Record<string, unknown> = { status: nextStatus, updated_at: nowISO };

    if (nextStatus === 'APPROVED') {
      updatePayload.approved_by = admin.id;
      updatePayload.approved_at = nowISO;
    }

    if (nextStatus === 'PAID') {
      updatePayload.paid_at = nowISO;
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from('prize_payouts')
      .update(updatePayload)
      .eq('id', payoutId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
