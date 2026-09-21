import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rateLimit';
import { resolveVetoProgress } from '@/lib/veto/service';

// Heartbeat ของ Veto: เติมสเต็ปที่หมดเวลา (Auto-pick) และ DECIDER แล้วปิด Veto เมื่อครบ
// เรียกจาก OBS Overlay ทุก ~5 วินาทีระหว่างสถานะ VETO (Vercel Hobby ตั้ง cron ถี่ระดับวินาทีไม่ได้)
// ปลอดภัยที่จะเปิดสาธารณะ: ทำได้เฉพาะสิ่งที่ "ถึงเวลาต้องเกิดอยู่แล้ว" ตามเวลาและ veto_format ผลลัพธ์กำหนดจาก matchId + สเต็ป (เรียกซ้ำ/พร้อมกันได้ผลเดียวกัน)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: matchId } = await params;

  const limit = checkRateLimit(`veto-tick:${matchId}`, 60, 60);
  if (!limit.ok) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
  }

  try {
    const progress = await resolveVetoProgress(createAdminClient(), matchId);
    if (!progress) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }
    return NextResponse.json({
      status: progress.status,
      applied: progress.inserted.map((r) => ({ step: r.step_order, action: r.action, map_name: r.map_name })),
      complete: progress.complete,
      finalized: progress.finalized,
      config_problems: progress.problems,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
