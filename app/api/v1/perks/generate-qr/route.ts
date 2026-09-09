import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GenerateQrSchema } from '@/types/perks';
import { issuePerkToken } from '@/lib/perks/perkToken';
import { checkAccessGate } from '@/lib/billing/checkAccessGate';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = GenerateQrSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { perk_id, redeemed_by_player_id, redeem_amount } = parsed.data;

    const { data: perk, error: perkError } = await supabase
      .from('sponsor_perks')
      .select('id, team_id, is_active, valid_until')
      .eq('id', perk_id)
      .single();

    if (perkError || !perk) {
      return NextResponse.json({ error: { code: 'PERK_INACTIVE', message: 'ไม่พบสิทธิพิเศษนี้' } }, { status: 404 });
    }

    const { data: isLeader } = await supabase.rpc('is_team_leader', { p_team_id: perk.team_id });
    if (!isLeader) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ต้องเป็นหัวหน้าทีม VIP_CLUB เท่านั้น' } }, { status: 403 });
    }

    if (!perk.is_active || new Date(perk.valid_until) < new Date()) {
      return NextResponse.json({ error: { code: 'PERK_INACTIVE', message: 'สิทธิพิเศษหมดอายุหรือถูกปิดใช้งาน' } }, { status: 400 });
    }

    // Grace Period: VIP perk generation blocked outright (Gate 4).
    const access = await checkAccessGate('TEAM', perk.team_id, 'VIP_PERK');
    if (!access.has_access) {
      const code = access.current_status === 'GRACE_PERIOD' ? 'FEATURE_RESTRICTED_IN_GRACE_PERIOD' : 'NOT_VIP_CLUB';
      return NextResponse.json({ error: { code, message: 'ไม่สามารถออก QR ได้ในสถานะสัญญาปัจจุบัน' } }, { status: 403 });
    }

    // Reserve the redemption row first (atomic quota headroom check happens
    // again for real at redeem time — this call only blocks obviously-over-quota
    // requests early so the partner never receives a QR that can't possibly redeem).
    const redemptionId = randomUUID();
    const perkToken = issuePerkToken({
      redemption_id: redemptionId,
      perk_id,
      team_id: perk.team_id,
      redeemed_by_player_id,
    });

    const { data: rpcResult, error: rpcError } = await supabase.rpc('request_perk_redemption', {
      p_perk_id: perk_id,
      p_redeemed_by_player_id: redeemed_by_player_id,
      p_amount: redeem_amount,
      p_perk_token: perkToken,
      p_redemption_id: redemptionId,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as { success: boolean; error?: string; redemption_id?: string; remaining_quota?: number };

    if (!result.success) {
      const status = result.error === 'QUOTA_EXCEEDED' ? 422 : 400;
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status });
    }

    return NextResponse.json({
      redemption_id: result.redemption_id,
      perk_token: perkToken,
      qr_payload: perkToken,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      remaining_quota: result.remaining_quota,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
