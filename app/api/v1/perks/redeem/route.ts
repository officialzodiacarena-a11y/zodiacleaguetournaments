import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { RedeemPerkSchema } from '@/types/perks';
import { verifyPartnerApiKey, verifyPerkToken } from '@/lib/perks/perkToken';

// Sprint 5.3 — partner scan endpoint. Partner Health Perk terminals have no
// Supabase account, so this route is authenticated ONLY via a static Partner
// API Key header — never a Supabase Bearer JWT (per QA Gate/Checklist item 3).
export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('X-Partner-Api-Key');
    if (!verifyPartnerApiKey(apiKey)) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Partner API Key ไม่ถูกต้อง' } }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ขาเข้าไม่ถูกต้อง' } }, { status: 400 });
    }

    const parsed = RedeemPerkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลขาเข้าไม่ถูกต้อง', details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const { perk_token, redeemed_amount } = parsed.data;

    const verification = verifyPerkToken(perk_token);
    if (!verification.valid) {
      const code = verification.reason === 'EXPIRED' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
      return NextResponse.json({ error: { code, message: 'QR Code ไม่ถูกต้องหรือหมดอายุ' } }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('redeem_sponsor_perk', {
      p_redemption_id: verification.payload.redemption_id,
      p_redeemed_amount: redeemed_amount,
    });

    if (rpcError) {
      return NextResponse.json({ error: { code: 'RPC_FAILED', message: rpcError.message } }, { status: 500 });
    }

    const result = rpcResult as {
      success: boolean;
      error?: string;
      redemption_id?: string;
      redeemed_amount?: number;
      remaining_quota?: number;
      redeemed_at?: string;
    };

    if (!result.success) {
      const statusByError: Record<string, number> = {
        TOKEN_ALREADY_USED: 400,
        AMOUNT_EXCEEDS_RESERVED: 422,
        QUOTA_EXCEEDED: 422,
        PERK_INACTIVE: 400,
        REDEMPTION_NOT_FOUND: 404,
      };
      return NextResponse.json({ error: { code: result.error, message: result.error } }, { status: statusByError[result.error ?? ''] ?? 400 });
    }

    return NextResponse.json({
      redemption_id: result.redemption_id,
      redeemed_amount: result.redeemed_amount,
      remaining_quota: result.remaining_quota,
      redeemed_at: result.redeemed_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
