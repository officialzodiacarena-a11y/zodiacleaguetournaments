// actions/tournament.ts
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

const VALID_SEASONS = ['SPRING', 'SUMMER', 'FALL', 'WINTER'] as const;
export type SeasonSplit = (typeof VALID_SEASONS)[number];

// บันทึก season ที่ผู้ใช้เลือกดูผ่าน cookie — หน้า Tournament Registry อ่านค่านี้ไปกรอง
// circuits/seasons/tournaments จริงจาก Supabase (แทน state ฝั่ง client ที่หายไปทุกครั้งที่ reload)
export async function selectSeasonAction(season: string): Promise<void> {
  if (!VALID_SEASONS.includes(season as SeasonSplit)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set('active_season_split', season, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath('/tournament');
}
