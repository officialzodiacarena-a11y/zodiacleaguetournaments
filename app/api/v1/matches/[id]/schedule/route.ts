import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { playerHasAnyRole } from '@/lib/auth/hasAnyRole';
import { effectiveReadyDeadline } from '@/lib/match/ready-access';
import { formatBangkokClock, planReschedule } from '@/lib/match/reschedule';

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// PATCH { delay_minutes: 15 | 30 | 60, reason: string } — ผู้ตัดสิน/แอดมินเลื่อนเวลานัด (ทุกครั้งมีบันทึกว่าใคร เมื่อไร เพราะอะไร)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Unauthorized', 401);
  }

  // เลื่อนเวลาแมตช์ได้เฉพาะกรรมการ/แอดมิน (รองรับผู้ใช้หลาย role) ก่อนแตะ admin client
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!player || !(await playerHasAnyRole(supabase, player.id))) {
    return errorResponse('FORBIDDEN_ROLE', 'สิทธิ์ในการเลื่อนเวลาแมตช์จำกัดเฉพาะกรรมการหรือแอดมินระบบเท่านั้น', 403);
  }

  let body: { delay_minutes?: unknown; reason?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse('BAD_REQUEST', 'รูปแบบ JSON Payload ไม่ถูกต้อง', 400);
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 3 || reason.length > 200) {
    return errorResponse('REASON_REQUIRED', 'ต้องระบุเหตุผลที่เลื่อน (3–200 ตัวอักษร)', 400);
  }

  const { data: currentMatch, error: fetchErr } = await supabase
    .from('matches')
    .select('id, status, scheduled_at, created_at, forfeit_deadline_at, team_a_ready_at, team_b_ready_at')
    .eq('id', matchId)
    .single();

  if (fetchErr || !currentMatch) {
    return errorResponse('MATCH_NOT_FOUND', 'Match not found', 404);
  }

  const plan = planReschedule({
    status: currentMatch.status,
    scheduledAt: currentMatch.scheduled_at,
    nowMs: Date.now(),
    delayMinutes: body.delay_minutes,
  });
  if (!plan.ok) {
    return errorResponse(plan.code, plan.message, plan.httpStatus);
  }

  const nowIso = new Date().toISOString();
  const adminSupabase = await createAdminClient();
  const { data: updatedRows, error: updateErr } = await adminSupabase
    .from('matches')
    .update({
      scheduled_at: plan.scheduledAt,
      rescheduled_from: currentMatch.scheduled_at,
      reschedule_reason: reason,
      forfeit_deadline_at: plan.forfeitDeadlineAt,
      updated_at: nowIso,
    })
    .eq('id', matchId)
    .eq('status', currentMatch.status)
    .select('id');

  if (updateErr) {
    console.error('[matches/schedule] update failed', updateErr);
    return errorResponse('UPDATE_FAILED', 'เกิดข้อผิดพลาด กรุณาลองใหม่', 500);
  }
  if (!updatedRows || updatedRows.length === 0) {
    return errorResponse('CANNOT_RESCHEDULE', 'สถานะแมตช์เปลี่ยนไประหว่างทำรายการ กรุณาโหลดใหม่', 422);
  }

  const readyDeadlineAt = effectiveReadyDeadline({
    forfeitDeadlineAt: plan.forfeitDeadlineAt,
    scheduledAt: plan.scheduledAt,
    createdAt: currentMatch.created_at,
    teamAReadyAt: currentMatch.team_a_ready_at,
    teamBReadyAt: currentMatch.team_b_ready_at,
  });

  // (1) บันทึกใครเลื่อน เมื่อไร เพราะอะไร
  const { error: auditErr } = await adminSupabase.from('match_state_transitions').insert({
    match_id: matchId,
    from_status: currentMatch.status,
    to_status: currentMatch.status,
    trigger_source: 'REFEREE',
    actor_id: player.id,
    reason,
    state_snapshot: {
      event: 'RESCHEDULE',
      from: currentMatch.scheduled_at,
      to: plan.scheduledAt,
      delay_minutes: body.delay_minutes as number,
      ready_deadline_at: readyDeadlineAt,
    },
  });
  if (auditErr) console.error('[matches/schedule] audit insert failed', auditErr.message);

  // (2) ข้อความระบบในห้อง Lobby
  const message = `[SYSTEM] ผู้ตัดสินเลื่อนเวลานัดเป็น ${formatBangkokClock(plan.scheduledAt)} น. · เส้นตายยืนยันความพร้อม ${formatBangkokClock(readyDeadlineAt)} น. · เหตุผล: ${reason}`;
  const { data: insertedMessage, error: messageErr } = await adminSupabase
    .from('match_lobby_messages')
    .insert({
      match_id: matchId,
      sender_id: null,
      sender_role: 'SYSTEM',
      message: message.slice(0, 500),
      is_system: true,
    })
    .select()
    .single();
  if (messageErr) console.error('[matches/schedule] system message failed', messageErr.message);

  if (insertedMessage) {
    await adminSupabase.channel(`match-lobby-${matchId}`).send({
      type: 'broadcast',
      event: 'lobby_message',
      payload: insertedMessage,
    });
  }

  // (3) ให้หน้า Lobby โหลดข้อมูลใหม่
  await adminSupabase.channel(`match-realtime-${matchId}`).send({
    type: 'broadcast',
    event: 'match_status_changed',
    payload: { match_id: matchId, status: currentMatch.status, scheduled_at: plan.scheduledAt },
  });

  return NextResponse.json({
    success: true,
    scheduled_at: plan.scheduledAt,
    rescheduled_from: currentMatch.scheduled_at,
    ready_deadline_at: readyDeadlineAt,
  });
}
