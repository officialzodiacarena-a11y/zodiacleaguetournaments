// lib/match/noShowStamp.ts
// แมตช์ที่ไม่มีทีมไหนกดพร้อมเลย forfeit_deadline_at จึงว่าง และ resolve_expired_ready_checks() ปรับแพ้ไม่ได้
// → ก่อนเรียกฟังก์ชันนั้น ให้ตั้ง forfeit_deadline_at = เส้นตายจากเวลานัด (effectiveReadyDeadline) ให้แมตช์ที่เลยเส้นตายแล้ว
// ใช้ใน GET /api/cron/walkover
import type { createAdminClient } from '@/lib/supabase/admin';
import { effectiveReadyDeadline, isReadyDeadlinePassed } from '@/lib/match/ready-access';

type AdminClient = ReturnType<typeof createAdminClient>;

interface NoShowCandidateRow {
  id: string;
  scheduled_at: string | null;
  created_at: string | null;
}

export async function stampNoShowDeadlines(admin: AdminClient, nowMs: number): Promise<string[]> {
  const { data: rows, error } = await admin
    .from('matches' as never)
    .select('id, scheduled_at, created_at')
    .eq('status', 'SCHEDULED')
    .is('forfeit_deadline_at', null)
    .is('team_a_ready_at', null)
    .is('team_b_ready_at', null)
    .not('team_a_id', 'is', null)
    .not('team_b_id', 'is', null)
    .not('stage_id', 'is', null)
    .not('scheduled_at', 'is', null);

  if (error) {
    console.error('[cron/walkover] read no-show candidates failed', error.message);
    return [];
  }

  const stamped: string[] = [];
  for (const row of (rows ?? []) as unknown as NoShowCandidateRow[]) {
    const deadline = effectiveReadyDeadline({
      forfeitDeadlineAt: null,
      scheduledAt: row.scheduled_at,
      createdAt: row.created_at,
      teamAReadyAt: null,
      teamBReadyAt: null,
    });
    if (!deadline || !isReadyDeadlinePassed(deadline, nowMs)) continue;

    // เงื่อนไขซ้ำอีกชั้น กันชนกับการกดพร้อมที่เข้ามาพร้อมกัน
    const { data: updated, error: updateErr } = await admin
      .from('matches' as never)
      .update({ forfeit_deadline_at: deadline } as never)
      .eq('id', row.id)
      .eq('status', 'SCHEDULED')
      .is('forfeit_deadline_at', null)
      .is('team_a_ready_at', null)
      .is('team_b_ready_at', null)
      .select('id');

    if (updateErr) {
      console.error('[cron/walkover] stamp no-show deadline failed', row.id, updateErr.message);
      continue;
    }
    if (updated && (updated as unknown[]).length > 0) stamped.push(row.id);
  }

  return stamped;
}
