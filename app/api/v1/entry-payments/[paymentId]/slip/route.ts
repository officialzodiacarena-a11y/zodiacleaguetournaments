import { randomUUID } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkSlip } from '@/lib/payments/slipok';
import type { Json } from '@/types/database.types';

export const runtime = 'nodejs';

const PAYMENT_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> | { paymentId: string } }
) {
  try {
    const resolvedParams = await params;
    const paymentId = resolvedParams.paymentId;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบก่อน' } },
        { status: 401 }
      );
    }

    const { data: actor } = await supabase.from('players').select('id').eq('user_id', user.id).single();
    if (!actor) {
      return NextResponse.json({ error: { code: 'PROFILE_NOT_FOUND', message: 'ไม่พบโปรไฟล์นักกีฬาของคุณ' } }, { status: 404 });
    }

    if (!PAYMENT_ID_REGEX.test(paymentId)) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ Payment ID ไม่ถูกต้อง' } }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('slip');
    if (!(file instanceof File) || !ALLOWED_TYPES[file.type] || file.size < 1 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE', message: 'รองรับเฉพาะรูป jpg / png / webp ไม่เกิน 5MB' } },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: payment, error: paymentError } = await admin
      .from('tournament_entry_payments')
      .select('id, tournament_id, team_id, amount_thb, status')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'ไม่พบรายการชำระเงินนี้' } }, { status: 404 });
    }

    const { data: team } = await admin.from('teams').select('captain_id').eq('id', payment.team_id).single();
    if (!team || team.captain_id !== actor.id) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ทำรายการนี้' } }, { status: 403 });
    }

    if (payment.status !== 'AWAITING_PAYMENT') {
      return NextResponse.json(
        { error: { code: 'PAYMENT_NOT_OPEN', message: 'รายการนี้ส่งสลิปแล้วหรือปิดแล้ว', status: payment.status } },
        { status: 409 }
      );
    }

    const { count: attemptCount } = await admin
      .from('tournament_entry_slip_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('payment_id', payment.id)
      .gte('created_at', new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString());

    if ((attemptCount ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: { code: 'TOO_MANY_ATTEMPTS', message: 'อัปโหลดบ่อยเกินไป กรุณารอ 10 นาที' } },
        { status: 429 }
      );
    }

    const ext = ALLOWED_TYPES[file.type];
    const path = `${payment.tournament_id}/${payment.id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from('entry-slips')
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: { code: 'UPLOAD_FAILED', message: uploadError.message } }, { status: 500 });
    }

    const check = await checkSlip(file, `slip.${ext}`, Number(payment.amount_thb));
    console.log('[entry-slip] check.code =', check.code);

    const { data, error } = await admin.rpc('submit_entry_slip_result', {
      p_payment_id: payment.id,
      p_actor_player_id: actor.id,
      p_slip_path: path,
      p_verdict: check.verdict,
      p_check_code: check.code,
      p_check_message: check.message,
      p_trans_ref: check.transRef,
      p_trans_at: check.transAt,
      p_amount_thb: check.amountThb,
      p_provider_response: (check.providerResponse ?? null) as Json | null,
    });

    if (error) {
      return NextResponse.json({ error: { code: 'VERIFY_SAVE_FAILED', message: error.message } }, { status: 500 });
    }

    const result = data as unknown as { ok: boolean; code?: string; outcome?: string; message?: string };

    if (result.ok === false) {
      return NextResponse.json({ error: { code: result.code, message: result.message } }, { status: 409 });
    }

    return NextResponse.json({ outcome: result.outcome, code: result.code, message: result.message }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
