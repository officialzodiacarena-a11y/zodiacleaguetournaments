import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';
import { ENTRY_FEE_REVIEWER_ROLES } from '@/lib/admin/requireEntryFeeReviewerPage';

const ReviewEntryPaymentSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT_SLIP', 'CANCEL']),
  reason: z.string().max(300).optional(),
});

const DECISION_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: 'ไม่มีสิทธิ์',
  REASON_REQUIRED: 'กรุณาใส่เหตุผล',
  PAYMENT_NOT_OPEN: 'รายการนี้ถูกตัดสินไปแล้ว',
  TOURNAMENT_FULL: 'ทีมเต็มแล้ว ต้องยกเลิกทีมอื่นก่อน',
  PAYMENT_NOT_FOUND: 'ไม่พบรายการ',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, ENTRY_FEE_REVIEWER_ROLES);
    if ('error' in gate) return gate.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON ไม่ถูกต้อง' } }, { status: 400 });
    }

    const parseResult = ReviewEntryPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ข้อมูลไม่ถูกต้อง', details: parseResult.error.format() } },
        { status: 400 }
      );
    }

    const { decision, reason } = parseResult.data;

    const { data, error } = await supabase.rpc('review_entry_payment', {
      p_payment_id: id,
      p_decision: decision,
      p_reason: reason?.trim() || null,
    });

    if (error) {
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    }

    const result = data as unknown as { ok: boolean; code?: string };

    if (result.ok === false) {
      const message = (result.code && DECISION_ERROR_MESSAGES[result.code]) || 'ทำรายการไม่สำเร็จ';
      return NextResponse.json({ error: { code: result.code, message } }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
