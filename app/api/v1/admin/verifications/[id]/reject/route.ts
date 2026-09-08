import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { RejectVerificationSchema } from '@/types/verification';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: gameAccountId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: admin, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !admin) {
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
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์ปฏิเสธการยืนยันตัวตน' } },
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

    const parseResult = RejectVerificationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด — ต้องระบุ rejection_reason', details: parseResult.error.format() } },
        { status: 400 }
      );
    }
    const { rejection_reason } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: gameAccount, error: fetchError } = await adminSupabase
      .from('game_accounts')
      .select('id, player_id, verification_status')
      .eq('id', gameAccountId)
      .single();

    if (fetchError || !gameAccount) {
      return NextResponse.json(
        { error: { code: 'GAME_ACCOUNT_NOT_FOUND', message: 'ไม่พบคำขอยืนยันตัวตนนี้ในระบบ' } },
        { status: 404 }
      );
    }

    if (gameAccount.verification_status !== 'PENDING' && gameAccount.verification_status !== 'MANUAL_REVIEW') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE_TRANSITION', message: `ไม่สามารถปฏิเสธจากสถานะ ${gameAccount.verification_status} ได้ ต้องเป็น PENDING เท่านั้น` } },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await adminSupabase
      .from('game_accounts')
      .update({
        verification_status: 'REJECTED',
        rejection_reason,
        reviewed_at: nowIso,
        verified_by: admin.id,
      })
      .eq('id', gameAccountId)
      .select('id, player_id, verification_status, rejection_reason')
      .single();

    if (updateError) {
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: updateError.message } }, { status: 500 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: admin.id,
      action: 'REJECT',
      entity_type: 'game_accounts',
      entity_id: gameAccountId,
      reason: rejection_reason,
      after_data: { verification_status: 'REJECTED', player_id: gameAccount.player_id },
    });

    await adminSupabase.channel(`player-presence-${gameAccount.player_id}`).send({
      type: 'broadcast',
      event: 'verification_updated',
      payload: { player_id: gameAccount.player_id, verification_status: 'REJECTED', rejection_reason },
    });

    return NextResponse.json({
      success: true,
      message: 'ปฏิเสธคำขอและแจ้งเหตุผลผู้ใช้เรียบร้อย',
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
