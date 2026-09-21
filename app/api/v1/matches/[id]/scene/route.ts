import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { loadSeriesState } from '@/lib/overlay/match-series';
import { withSceneMemory } from '@/lib/overlay/series-flow';
import { asUpdate } from '@/types/supabase-helpers';

// บันทึกฉาก OBS Overlay ที่ผู้คุมเลือก ลง matches.format_config.overlay_scene
// เหตุผล: สถานะแมตช์ใน DB กลับจาก AWAITING_RESULT เป็น LIVE ไม่ได้ (ระหว่างซีรีส์ BO3/BO5) ฉากที่ส่งด้วย Broadcast อย่างเดียวจึงหายเมื่อ OBS รีเฟรช
// overlay_scene_games = จำนวนเกมที่จบแล้ว ณ ตอนที่เลือกฉาก — Overlay ใช้ค่านี้เฉพาะเมื่อยังตรงกับจำนวนเกมที่จบจริง (กันฉากค้างจากรอบเทสก่อน)
// Overlay ใช้ค่านี้เป็นฉากตั้งต้น และยังรับ Broadcast เพื่อสลับทันที
const SceneSchema = z.object({
  scene: z.enum(['VETO', 'LIVE', 'AWAITING_RESULT']),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const auth = await requireBroadcastRole(supabase);
    if (!auth.ok) return auth.response;

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = SceneSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'scene ต้องเป็น VETO, LIVE หรือ AWAITING_RESULT' } }, { status: 400 });
    }

    const admin = createAdminClient();
    const state = await loadSeriesState(admin, matchId);
    const match = state?.match;
    if (!state || !match) {
      return NextResponse.json({ error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์' } }, { status: 404 });
    }

    const { error } = await admin
      .from('matches')
      .update(asUpdate<'matches'>({ format_config: withSceneMemory(match.format_config, parsed.data.scene, state.completedCount), updated_at: new Date().toISOString() }))
      .eq('id', matchId);

    if (error) {
      return NextResponse.json({ error: { code: 'TRANSACTION_FAILED', message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ scene: parsed.data.scene });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
