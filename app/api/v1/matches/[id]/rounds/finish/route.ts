import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { loadSeriesState } from '@/lib/overlay/match-series';
import { planFinishMap } from '@/lib/overlay/series-flow';
import { saveFinishedGame } from '@/lib/overlay/match-game-rows';
import { asUpdate } from '@/types/supabase-helpers';

// จบแมพปัจจุบัน: บันทึกผลเกมจากสกอร์รอบที่กรอกไว้ ลงตาราง match_games แล้วรีเซ็ตสกอร์รอบเป็น 0–0
// - แมพ/เลขเกม มาจากลำดับ Veto และจำนวนเกมที่จบแล้ว (กติกาเดียวกับฉาก Overlay)
// - สถานะแมตช์ LIVE -> AWAITING_RESULT เฉพาะเมื่อซีรีส์ตัดสินผลครบ (ระหว่างซีรีส์คงเป็น LIVE เพราะ DB ไม่ให้กลับจาก AWAITING_RESULT)
// - ตั้งฉาก Overlay เป็น Intermission (จำใน format_config.overlay_scene ผูกกับจำนวนเกมที่จบแล้ว)
// ตรรกะตัดสินใจอยู่ใน lib/overlay/series-flow.ts (planFinishMap) และมีชุดทดสอบ tests/series-flow.test.ts
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: matchId } = await params;
    const supabase = await createClient();

    const auth = await requireBroadcastRole(supabase);
    if (!auth.ok) return auth.response;

    const admin = createAdminClient();
    const state = await loadSeriesState(admin, matchId);
    if (!state) {
      return NextResponse.json({ error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์' } }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const plan = planFinishMap(state, nowIso);
    if (!plan.ok) {
      return NextResponse.json({ error: { code: plan.code, message: plan.message } }, { status: plan.httpStatus });
    }

    // ถ้าล็อกรายชื่อไว้ก่อนเริ่มแมพ จะมีแถว LIVE ของเกมนี้อยู่แล้ว — อัปเดตแถวเดิมแทนการ insert ซ้ำ
    const { error: insertErr } = await saveFinishedGame(admin, matchId, plan.game);

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: { code: 'GAME_ALREADY_REPORTED', message: 'เกมนี้ถูกบันทึกผลไปแล้ว' } }, { status: 409 });
      }
      return NextResponse.json({ error: { code: 'TRANSACTION_FAILED', message: insertErr.message } }, { status: 500 });
    }

    const { error: updateErr } = await admin.from('matches').update(asUpdate<'matches'>(plan.matchUpdate)).eq('id', matchId);
    if (updateErr) {
      return NextResponse.json(
        { error: { code: 'PARTIAL_FAILURE', message: `บันทึกผลเกมแล้ว แต่รีเซ็ตสกอร์รอบ/สถานะไม่สำเร็จ: ${updateErr.message}` } },
        { status: 500 }
      );
    }

    return NextResponse.json(plan.result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
