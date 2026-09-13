import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asUpdate } from '@/types/supabase-helpers';

// อนุญาตเฉพาะสถานะที่กรรมการ/แอดมินสั่งเปลี่ยนมือได้เอง (READY_CHECK/VETO/WALKOVER
// ล้วนเป็นผลลัพธ์อัตโนมัติของ engine อื่น ไม่ใช่คำสั่ง manual จากพอร์ตนี้)
const UpdateStatusSchema = z.object({
  status: z.enum(['PAUSED', 'LIVE', 'AWAITING_RESULT']),
  reason: z.string().min(1, { message: 'กรุณาระบุเหตุผลในการแก้ไขข้อมูล' }).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const matchId = resolvedParams.id;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = UpdateStatusSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้องตามรูปแบบ', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { status, reason } = parseResult.data;

    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!player) {
      return NextResponse.json(
        { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบโปรไฟล์ผู้เล่นของบัญชีนี้' } },
        { status: 404 }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', player.id)
      .is('revoked_at', null)
      .single();

    const allowedRoles = ['REFEREE', 'ADMIN', 'SUPER_ADMIN'];
    if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีของคุณไม่มีสิทธิ์ในการควบคุมหรือสลับสถานะแมตช์นี้' } },
        { status: 403 }
      );
    }

    const { data: currentMatch, error: matchFetchError } = await supabase
      .from('matches')
      .select('id, status')
      .eq('id', matchId)
      .single();

    if (matchFetchError || !currentMatch) {
      return NextResponse.json(
        { error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์แข่งขันที่ระบุ' } },
        { status: 404 }
      );
    }

    const nowISO = new Date().toISOString();
    const updatePayload: Record<string, string> = { status, updated_at: nowISO };

    if (status === 'LIVE') {
      updatePayload.started_at = nowISO;
    } else if (status === 'AWAITING_RESULT') {
      updatePayload.ended_at = nowISO;
    }

    const adminSupabase = createAdminClient();
    const { data: updatedMatch, error: updateError } = await adminSupabase
      .from('matches')
      .update(asUpdate<'matches'>(updatePayload))
      .eq('id', matchId)
      .select()
      .single();

    if (updateError) {
      if (updateError.message.includes('INVALID_STATUS_TRANSITION')) {
        return NextResponse.json(
          { error: { code: 'INVALID_STATUS_TRANSITION', message: `การสลับสเต็ปขัดต่อกฎเกณฑ์: ${updateError.message}` } },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: { code: 'TRANSACTION_FAILED', message: updateError.message } },
        { status: 500 }
      );
    }

    await adminSupabase.from('match_state_transitions').insert({
      match_id: matchId,
      from_status: currentMatch.status,
      to_status: status,
      trigger_source: 'REFEREE',
      actor_id: player.id,
      reason: reason || 'สลับข้อมูลโดยผู้ตัดสินประจำลีก',
      state_snapshot: { updated_at: nowISO },
    });

    const realtimeChannel = `match-realtime-${matchId}`;
    await adminSupabase.channel(realtimeChannel).send({
      type: 'broadcast',
      event: 'match_status_changed',
      payload: { status, updated_at: nowISO },
    });

    return NextResponse.json({
      success: true,
      message: `ปรับสถานะแมตช์การแข่งขันเป็น [ ${status} ] และซิงค์จอ Overlay เรียบร้อยแล้ว`,
      data: updatedMatch,
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
