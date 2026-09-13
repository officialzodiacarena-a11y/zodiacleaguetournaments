import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EarningRuleRow, WatchSessionRow } from '@/types/watch-to-earn';
import { asRpcResult } from '@/types/supabase-helpers';

const DEFAULT_DAILY_CAP_AP = 100;

function bangkokDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(date);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: streamId } = await params;
    const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key');

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'ต้องแนบ Idempotency-Key header มาด้วย' } },
        { status: 400 }
      );
    }

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

    const adminSupabase = createAdminClient();

    // 1. Idempotency Check — replay ของ request เดิม
    const { data: existingSession } = await adminSupabase
      .from('watch_sessions')
      .select('*')
      .eq('start_idempotency_key', idempotencyKey)
      .eq('player_id', player.id)
      .maybeSingle();

    if (existingSession) {
      const session = existingSession as WatchSessionRow;
      return NextResponse.json({
        success: true,
        message: 'Session นี้เริ่มไปแล้ว (Idempotent execution)',
        session_id: session.id,
        daily_remaining_ap: null,
      });
    }

    // 2. ตรวจสตรีม: ต้องมีอยู่จริง, เปิดให้รับ AP, และกำลังถ่ายทอดสด
    const { data: stream, error: streamError } = await adminSupabase
      .from('streams')
      .select('id, status, is_earn_eligible, earning_rule_id')
      .eq('id', streamId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: { code: 'STREAM_NOT_FOUND', message: 'ไม่พบสตรีมนี้ในระบบ' } },
        { status: 404 }
      );
    }

    if (!stream.is_earn_eligible) {
      return NextResponse.json(
        { error: { code: 'NOT_EARN_ELIGIBLE', message: 'สตรีมนี้ไม่ได้เปิดให้รับ AP จากการรับชม' } },
        { status: 422 }
      );
    }

    if (stream.status !== 'LIVE') {
      return NextResponse.json(
        { error: { code: 'STREAM_NOT_LIVE', message: 'สตรีมนี้ไม่ได้ถ่ายทอดสดอยู่ในขณะนี้' } },
        { status: 422 }
      );
    }

    if (!stream.earning_rule_id) {
      return NextResponse.json(
        { error: { code: 'NO_EARNING_RULE', message: 'สตรีมนี้ยังไม่ได้ผูกกติกาการให้ AP' } },
        { status: 422 }
      );
    }

    const { data: earningRule, error: ruleError } = await adminSupabase
      .from('ap_earning_rules')
      .select('*')
      .eq('id', stream.earning_rule_id)
      .single();

    if (ruleError || !earningRule || !asRpcResult<EarningRuleRow>(earningRule).is_active) {
      return NextResponse.json(
        { error: { code: 'EARNING_RULE_INACTIVE', message: 'กติกาการให้ AP ของสตรีมนี้ไม่พร้อมใช้งาน' } },
        { status: 422 }
      );
    }

    // 3. ตรวจว่ามี active session อื่นอยู่หรือไม่ (คนละสตรีมก็ห้าม)
    const { data: activeSession } = await adminSupabase
      .from('watch_sessions')
      .select('id, stream_id')
      .eq('player_id', player.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (activeSession) {
      return NextResponse.json(
        {
          error: {
            code: 'SESSION_ALREADY_ACTIVE',
            message: 'คุณมี watch session ที่กำลังทำงานอยู่แล้ว กรุณา claim หรือปิด session เดิมก่อน',
            active_session_id: activeSession.id,
          },
        },
        { status: 409 }
      );
    }

    // 4. ตรวจ daily cap
    const rule = asRpcResult<EarningRuleRow>(earningRule);
    const todayBkk = bangkokDateString(new Date());
    const dailyCap = rule.daily_cap_ap ?? DEFAULT_DAILY_CAP_AP;

    const { data: dailyLimit } = await adminSupabase
      .from('ap_daily_limits')
      .select('ap_earned, daily_cap')
      .eq('player_id', player.id)
      .eq('limit_date', todayBkk)
      .maybeSingle();

    const apEarnedToday = dailyLimit?.ap_earned ?? 0;
    const effectiveCap = dailyLimit?.daily_cap ?? dailyCap;

    if (apEarnedToday >= effectiveCap) {
      return NextResponse.json(
        {
          error: {
            code: 'DAILY_CAP_REACHED',
            message: 'คุณรับ AP จากการรับชมครบโควต้าของวันนี้แล้ว',
            daily_earned: apEarnedToday,
            daily_cap: effectiveCap,
          },
        },
        { status: 422 }
      );
    }

    // 5. สร้าง watch_sessions record
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : null;
    const nowISO = new Date().toISOString();

    const { data: newSession, error: insertError } = await adminSupabase
      .from('watch_sessions')
      .insert({
        stream_id: streamId,
        player_id: player.id,
        earning_rule_id: rule.id,
        status: 'ACTIVE',
        started_at: nowISO,
        position_sec: 0,
        watched_seconds: 0,
        risk_score: 0,
        start_idempotency_key: idempotencyKey,
        ip_address: ipAddress,
      })
      .select()
      .single();

    if (insertError || !newSession) {
      return NextResponse.json(
        { error: { code: 'INSERT_FAILED', message: insertError?.message ?? 'สร้าง watch session ไม่สำเร็จ' } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        session_id: newSession.id,
        earning_rule: {
          id: rule.id,
          ap_per_interval: rule.ap_per_interval,
          interval_seconds: rule.interval_seconds,
          daily_cap_ap: effectiveCap,
        },
        daily_remaining_ap: effectiveCap - apEarnedToday,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
