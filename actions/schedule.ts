// actions/schedule.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function setMatchReminderAction(matchId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const targetMatchId = matchId;
  
  // TODO: บันทึกแจ้งเตือนลง user_notifications หรือ Web Push
  revalidatePath('/schedule');
}
