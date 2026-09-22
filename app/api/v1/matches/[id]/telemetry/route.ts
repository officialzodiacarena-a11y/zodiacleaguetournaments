import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getObserverTokenHash, hashObserverToken } from '@/lib/overlay/observer-token';
import { TelemetryFrameSchema } from '@/lib/overlay/telemetry-schema';

// รับ telemetry รายรอบจาก Observer Bridge (เครื่องคนจับกล้อง) แล้ว relay ต่อเป็น Realtime Broadcast
// ไม่เขียนลง DB (ข้อมูลเปลี่ยนทุกวินาที ไม่ใช่สถานะที่ต้อง persist) — ตามแบบ scene_change/hud_notification เดิม
// จับคู่ผู้เล่นด้วยชื่อทำที่ฝั่ง Overlay client เอง (route นี้ไม่รู้จัก roster)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: matchId } = await params;

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const token = bearerToken || req.headers.get('x-observer-token') || '';

    if (!token) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'ต้องแนบ Observer Token (Authorization: Bearer <token>)' } },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { data: match, error: findError } = await admin
      .from('matches')
      .select('id, format_config')
      .eq('id', matchId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: { code: 'QUERY_FAILED', message: findError.message } }, { status: 500 });
    }
    if (!match) {
      return NextResponse.json({ error: { code: 'MATCH_NOT_FOUND', message: 'ไม่พบข้อมูลแมตช์' } }, { status: 404 });
    }

    const storedHash = getObserverTokenHash(match.format_config);
    if (!storedHash) {
      return NextResponse.json(
        { error: { code: 'OBSERVER_NOT_CONFIGURED', message: 'แมตช์นี้ยังไม่ได้ออก Observer Token — ออกจากหน้า Spectator Control ก่อน' } },
        { status: 409 }
      );
    }

    if (hashObserverToken(token) !== storedHash) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Observer Token ไม่ถูกต้องหรือถูกหมุนคีย์ใหม่แล้ว' } }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = TelemetryFrameSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'รูปแบบข้อมูล telemetry ไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    await admin.channel(`match-realtime-${matchId}`).send({
      type: 'broadcast',
      event: 'stream_telemetry_relay',
      payload: parsed.data,
    });

    return NextResponse.json({ received: true, count: parsed.data.players.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error(`[telemetry] ${message}`);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
