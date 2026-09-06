// actions/tournament.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function selectSeasonAction(season: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selectedSeason = season;
  // TODO: บันทึก preference หรือ filter ข้อมูล
  revalidatePath('/tournaments');
}
