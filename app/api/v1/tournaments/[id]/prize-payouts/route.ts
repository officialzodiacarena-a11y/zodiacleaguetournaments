import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreatePrizePayoutSchema } from '@/types/payments';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: tournamentId } = await params;
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
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' } },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบประวัติโปรไฟล์ของคุณในระบบลีก' } },
        { status: 404 }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', admin.id)
      .is('revoked_at', null)
      .single();

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (roleError || !userRole || !allowedRoles.includes(userRole.role)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN_ROLE', message: 'บัญชีนี้ไม่มีสิทธิ์สร้างรายการจ่ายเงินรางวัล' } },
        { status: 403 }
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

    const parseResult = CreatePrizePayoutSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ตรงข้อกำหนด', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { playerId, gross, taxWithheld } = parseResult.data;
    const net = gross - taxWithheld;

    const adminSupabase = createAdminClient();

    const { data: existing } = await adminSupabase
      .from('prize_payouts')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'รายการนี้ถูกสร้างไปแล้ว (Idempotent execution)',
        prize_payout_id: existing.id,
        status: existing.status,
      });
    }

    const { data: recipient, error: recipientError } = await adminSupabase
      .from('players')
      .select('id, kyc_verified_at')
      .eq('id', playerId)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: { code: 'PLAYER_NOT_FOUND', message: 'ไม่พบผู้เล่นที่ระบุ' } },
        { status: 404 }
      );
    }

    if (!recipient.kyc_verified_at) {
      return NextResponse.json(
        { error: { code: 'KYC_REQUIRED', message: 'ผู้รับเงินรางวัลต้องผ่านการยืนยันตัวตน (KYC) ก่อนสร้างรายการจ่ายเงิน' } },
        { status: 422 }
      );
    }

    const { data: payout, error: insertError } = await adminSupabase
      .from('prize_payouts')
      .insert({
        tournament_id: tournamentId,
        player_id: playerId,
        gross,
        tax_withheld: taxWithheld,
        net,
        status: 'PENDING',
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: { code: 'INSERT_FAILED', message: insertError.message } }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: payout }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
