// actions/schedule.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = { success: true } | { error: { code: string; message: string } };

export async function setMatchReminderAction(matchId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: { code: 'UNAUTHENTICATED', message: 'กรุณาเข้าสู่ระบบก่อน' } };
  }

  const { data: player } = await supabase.from('players').select('id').eq('user_id', user.id).single();
  if (!player) {
    return { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบโปรไฟล์นักกีฬาของคุณ' } };
  }

  const { data: match } = await supabase
    .from('matches')
    .select('id, scheduled_at')
    .eq('id', matchId)
    .single();

  if (!match) {
    return { error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบแมตช์นี้' } };
  }

  // notifications ไม่มีฟิลด์ metadata ในสคีมาปัจจุบัน — ใช้ action_url เป็น key กันแจ้งเตือนซ้ำ
  const actionUrl = `/schedule?matchId=${matchId}`;
  const { data: existingReminder } = await supabase
    .from('notifications')
    .select('id')
    .eq('player_id', player.id)
    .eq('type', 'MATCH_REMINDER')
    .eq('action_url', actionUrl)
    .maybeSingle();

  if (!existingReminder) {
    const { error: insertError } = await supabase.from('notifications').insert({
      player_id: player.id,
      type: 'MATCH_REMINDER',
      title: 'ตั้งเตือนแมตช์สำเร็จ',
      body: match.scheduled_at
        ? `แมตช์จะเริ่มเวลา ${new Date(match.scheduled_at).toLocaleString('th-TH')}`
        : 'แมตช์นี้ยังไม่กำหนดเวลาที่แน่นอน',
      action_url: actionUrl,
    });

    if (insertError) {
      return { error: { code: 'REMINDER_FAILED', message: insertError.message } };
    }
  }

  revalidatePath('/schedule');
  return { success: true };
}
