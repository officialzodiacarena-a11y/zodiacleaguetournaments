import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';
import { ENTRY_FEE_REVIEWER_ROLES } from '@/lib/admin/requireEntryFeeReviewerPage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, ENTRY_FEE_REVIEWER_ROLES);
    if ('error' in gate) return gate.error;

    const admin = createAdminClient();
    const { data: payment, error } = await admin
      .from('tournament_entry_payments')
      .select('slip_path')
      .eq('id', id)
      .single();

    if (error || !payment?.slip_path) {
      return NextResponse.json({ error: { code: 'SLIP_NOT_FOUND', message: 'ไม่พบสลิปของรายการนี้' } }, { status: 404 });
    }

    const { data: signed, error: signError } = await admin.storage
      .from('entry-slips')
      .createSignedUrl(payment.slip_path, 300);

    if (signError || !signed) {
      return NextResponse.json({ error: { code: 'SLIP_NOT_FOUND', message: 'สร้างลิงก์ดูสลิปไม่สำเร็จ' } }, { status: 404 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
