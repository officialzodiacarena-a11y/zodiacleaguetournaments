import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveVetoProgress } from '@/lib/veto/service';

// Cron สำรองของ Veto Auto-pick (ต้องมี CRON_SECRET)
// เดิม: แบนแมพสุ่ม 1 อันในทุกแมตช์ VETO ทุกครั้งที่ถูกเรียก โดยไม่ตรวจเวลา ไม่ดูลำดับ และไม่ปิด Veto
// ตอนนี้: ใช้ Veto Step Engine — เติมเฉพาะสเต็ปที่หมดเวลาตาม veto_format (BAN/PICK ตามลำดับ), DECIDER อัตโนมัติ, ปิด Veto (VETO -> LIVE) เมื่อครบ
// หมายเหตุ: heartbeat หลักคือ POST /api/v1/matches/[id]/veto/tick ที่ Overlay เรียกทุก ~5 วินาที ตัว cron นี้เป็นตัวสำรองสำหรับตัวตั้งเวลาภายนอก
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: vetoMatches } = await admin.from('matches').select('id').eq('status', 'VETO');

  const processed: Array<{ matchId: string; applied: Array<{ step: number; action: string; map_name: string }>; complete: boolean }> = [];

  for (const match of vetoMatches ?? []) {
    try {
      const progress = await resolveVetoProgress(admin, match.id);
      if (progress && (progress.inserted.length > 0 || progress.finalized)) {
        processed.push({
          matchId: match.id,
          applied: progress.inserted.map((r) => ({ step: r.step_order, action: r.action, map_name: r.map_name })),
          complete: progress.complete,
        });
      }
    } catch (error: unknown) {
      console.error('[veto-autopick] failed for match', match.id, error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ success: true, checked: vetoMatches?.length ?? 0, processed_count: processed.length, processed });
}
