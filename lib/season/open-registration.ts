// lib/season/open-registration.ts
// นับทัวร์ที่ "เปิดรับสมัครจริง": status = OPEN และยังไม่ถึงเวลาปิดรับ · ไม่นับ format TEST
// (ค่า status ที่ถูกต้องตาม CHECK constraint คือ DRAFT / OPEN / ONGOING / CONCLUDED —
//  โค้ดเดิมกรอง 'REGISTRATION_OPEN' / 'ACTIVE' ซึ่งไม่มีอยู่จริง จึงนับได้ 0 เสมอ)
import type { SupabaseClient } from '@supabase/supabase-js';

export async function countOpenRegistrationTournaments(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('tournaments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'OPEN')
      .neq('format', 'TEST')
      .gt('registration_closes_at', now.toISOString());
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
