// actions/team.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function invitePlayerAction(teamId: string, formData: FormData): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const targetUserIdentifier = formData.get('identifier') as string;
  
  // TODO: ส่ง Invite ไปยังผู้เล่นเป้าหมาย
  revalidatePath(`/teams/${teamId}`);
}

export async function lockRosterAction(teamId: string): Promise<void> {
  // TODO: อัปเดต team status เป็น LOCKED
  revalidatePath(`/teams/${teamId}`);
}
