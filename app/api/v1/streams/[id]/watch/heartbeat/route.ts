import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HeartbeatPayloadSchema, type WatchSessionRow } from '@/types/watch-to-earn';

const HEARTBEAT_INTERVAL_SECONDS = 15;
const HEARTBEAT_MIN_GAP_SECONDS = 15;
const DELTA_TOLERANCE_MULTIPLIER = 1.2;
const RISK_SCORE_PER_VIOLATION = 25;
const RISK_SCORE_MAX = 100;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: streamId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนดูสตรีม' } },
        { status: 401 }
      );
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } },
        { status: 400 }
      );
    }

    const parseResult = HeartbeatPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { positionSec, playbackRate, deltaSec, watchedSeconds } = parseResult.data;

    const adminSupabase = createAdminClient();

    const { data: sessionData, error: sessionError } = await adminSupabase
      .from('watch_sessions')
      .select('*')
      .eq('stream_id', streamId)
      .eq('player_id', player.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: { code: 'NO_ACTIVE_SESSION', message: 'ไม่พบ watch session ที่กำลังทำงานอยู่สำหรับสตรีมนี้' } },
        { status: 404 }
      );
    }

    const session = sessionData as WatchSessionRow;
    const now = new Date();

    // Rate limit: 1 request ต่อ 15 วินาที ต่อ session
    if (session.last_heartbeat_at) {
      const secondsSinceLast = (now.getTime() - new Date(session.last_heartbeat_at).getTime()) / 1000;
      if (secondsSinceLast < HEARTBEAT_MIN_GAP_SECONDS) {
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: `ส่ง heartbeat ถี่เกินไป ต้องเว้นอย่างน้อย ${HEARTBEAT_MIN_GAP_SECONDS} วินาที`,
              retry_after_sec: Math.ceil(HEARTBEAT_MIN_GAP_SECONDS - secondsSinceLast),
            },
          },
          { status: 429 }
        );
      }
    }

    // Layer 2 server-side validation
    const violations: string[] = [];

    if (playbackRate > 1.0 + 0.001) {
      violations.push(`playback_rate ${playbackRate} เกิน 1.0`);
    }

    if (deltaSec > HEARTBEAT_INTERVAL_SECONDS * DELTA_TOLERANCE_MULTIPLIER) {
      violations.push(`delta_sec ${deltaSec} เกินเพดาน ${HEARTBEAT_INTERVAL_SECONDS * DELTA_TOLERANCE_MULTIPLIER}`);
    }

    if (positionSec < session.position_sec) {
      violations.push(`position_sec ${positionSec} ย้อนหลังกว่าค่าก่อนหน้า ${session.position_sec}`);
    }

    const wallClockElapsedSec = (now.getTime() - new Date(session.started_at).getTime()) / 1000;
    if (watchedSeconds > wallClockElapsedSec + 1) {
      violations.push(
        `watched_seconds ${watchedSeconds} เกินเวลาที่ผ่านไปจริง ${wallClockElapsedSec.toFixed(2)} วินาที (wall-clock)`
      );
    }

    const isAnomalous = violations.length > 0;
    const riskScoreDelta = isAnomalous ? Math.min(RISK_SCORE_PER_VIOLATION * violations.length, RISK_SCORE_MAX) : 0;
    const newRiskScore = Math.min(session.risk_score + riskScoreDelta, RISK_SCORE_MAX);

    // Heartbeat ที่ผ่านการตรวจเท่านั้นที่จะถูกนำไปสะสมเวลาดู (กัน farm AP)
    const nextPositionSec = isAnomalous ? session.position_sec : positionSec;
    const nextWatchedSeconds = isAnomalous ? session.watched_seconds : session.watched_seconds + deltaSec;
    const anomalyNote = isAnomalous
      ? [session.anomaly_note, `[${now.toISOString()}] ${violations.join('; ')}`].filter(Boolean).join(' | ')
      : session.anomaly_note;

    const { error: updateError } = await adminSupabase
      .from('watch_sessions')
      .update({
        last_heartbeat_at: now.toISOString(),
        position_sec: nextPositionSec,
        watched_seconds: nextWatchedSeconds,
        risk_score: newRiskScore,
        is_anomalous: session.is_anomalous || isAnomalous,
        anomaly_note: anomalyNote,
        updated_at: now.toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 500 }
      );
    }

    await adminSupabase.from('watch_heartbeats').insert({
      session_id: session.id,
      position_sec: positionSec,
      playback_rate: playbackRate,
      delta_sec: deltaSec,
      watched_seconds: watchedSeconds,
      is_anomalous: isAnomalous,
      anomaly_reason: isAnomalous ? violations.join('; ') : null,
      risk_score_delta: riskScoreDelta,
    });

    return NextResponse.json({
      success: true,
      accepted: !isAnomalous,
      risk_score: newRiskScore,
      is_anomalous: session.is_anomalous || isAnomalous,
      session_watched_seconds: nextWatchedSeconds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
