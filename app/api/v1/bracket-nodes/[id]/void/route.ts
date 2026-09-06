// PATCH /api/v1/bracket-nodes/:id/void
// T2.2-B06 (part 2) — void a bracket node (e.g. both teams withdrew).
// Org Admin only, enforced by RLS (bracket_nodes_admin_write), same pattern
// as T2.2-A04's PATCH /stages/:id/status: the app checks the caller is
// authenticated, then lets Postgres reject a non-admin's write outright.
//
// Two business rules enforced here (both explicitly required, not inferred):
//   - voided_reason is required in the body -> 422 if missing/blank.
//   - a COMPLETED node can't be voided -> 422. Nothing else is blocked here
//     (PENDING/READY/LIVE all remain voidable) -- the task only called out
//     COMPLETED, so no further status guard was invented beyond that.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'กรุณาเข้าสู่ระบบก่อน' } },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'invalid JSON body' } },
      { status: 400 }
    );
  }

  const voidedReason = body.voided_reason;
  if (typeof voidedReason !== 'string' || voidedReason.trim() === '') {
    return NextResponse.json(
      { error: { code: 'VOIDED_REASON_REQUIRED', message: 'voided_reason is required to void a bracket node' } },
      { status: 422 }
    );
  }

  const { data: node } = await supabase
    .from('bracket_nodes')
    .select('id, status')
    .eq('id', nodeId)
    .maybeSingle();

  if (!node) {
    return NextResponse.json(
      { error: { code: 'NODE_NOT_FOUND', message: 'ไม่พบ bracket node นี้' } },
      { status: 404 }
    );
  }

  if (node.status === 'COMPLETED') {
    return NextResponse.json(
      {
        error: {
          code: 'NODE_ALREADY_COMPLETED',
          message: 'void bracket node ที่มีผลแข่งขัน (COMPLETED) แล้วไม่ได้',
        },
      },
      { status: 422 }
    );
  }

  const { data: updated, error } = await supabase
    .from('bracket_nodes')
    .update({ status: 'VOID', voided_reason: voidedReason })
    .eq('id', nodeId)
    .select('*')
    .single();

  if (error) {
    // Same RLS-denied-UPDATE-vs-CHECK-constraint disambiguation as the
    // stages routes: a policy-denied write matches 0 rows (PGRST116 via
    // .single()), not 42501 -- we already confirmed the row exists above,
    // so 0 rows here means RLS blocked the write, not that it disappeared.
    if (error.code === '42501' || error.code === 'PGRST116') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'ต้องเป็น Org Admin เท่านั้น' } },
        { status: 403 }
      );
    }
    // chk_void_reason backstop -- app-level check above should already
    // prevent this, but the DB constraint is the real source of truth.
    if (error.code === '23514') {
      return NextResponse.json(
        { error: { code: 'VOIDED_REASON_REQUIRED', message: 'voided_reason is required to void a bracket node' } },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: updated }, { status: 200 });
}
