// actions/registration.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function submitRegistrationAction(
  tournamentId: string,
  teamId: string,
  entryFeeAp: number
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const payload = { tournamentId, teamId, entryFeeAp };

  // TODO:
  // 1. ตรวจสอบสิทธิ์ Captain / Owner
  // 2. ตัด AP Balance จากบัญชีทีม/ผู้เล่น (50 AP)
  // 3. สร้าง snapshot บันทึก roster_snapshots และ insert tournament_registrations
  
  revalidatePath(`/tournaments/${tournamentId}`);
  redirect(`/tournaments/${tournamentId}/confirmation`);
}
