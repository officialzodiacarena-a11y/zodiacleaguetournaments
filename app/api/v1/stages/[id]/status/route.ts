// PATCH /api/v1/stages/:id/status
// T2.2-A04 (part 2) — stage status state machine.
// Flow (Sprint2.2_Spec.md 2.2.A):
//   PENDING -> SEEDING -> ACTIVE -> COMPLETED
//   PENDING | SEEDING | ACTIVE -> CANCELLED (emergency, Org Admin)
// No skipping steps, no transitions out of COMPLETED/CANCELLED.
// Org Admin only, enforced by RLS (tournament_stages_admin_write).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type StageStatus = Database['public']['Enums']['stage_status_type'];

const ALLOWED_TRANSITIONS: Record<StageStatus, StageStatus[]> = {
  PENDING: ['SEEDING', 'CANCELLED'],
  SEEDING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: stageId } = await params;
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

  const nextStatus = body.status;
  if (typeof nextStatus !== 'string' || !(nextStatus in ALLOWED_TRANSITIONS)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'status must be one of: SEEDING, ACTIVE, COMPLETED, CANCELLED' } },
      { status: 400 }
    );
  }
  const requestedStatus = nextStatus as StageStatus;

  const { data: stage } = await supabase
    .from('tournament_stages')
    .select('id, status')
    .eq('id', stageId)
    .maybeSingle();

  if (!stage) {
    return NextResponse.json(
      { error: { code: 'STAGE_NOT_FOUND', message: 'ไม่พบ stage นี้' } },
      { status: 404 }
    );
  }

  const currentStatus = stage.status as StageStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(requestedStatus)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `ไปจาก ${currentStatus} เป็น ${requestedStatus} ไม่ได้`,
          details: { current_status: currentStatus, requested_status: requestedStatus, allowed_next: allowed },
        },
      },
      { status: 422 }
    );
  }

  const { data: updated, error } = await supabase
    .from('tournament_stages')
    .update({ status: requestedStatus })
    .eq('id', stageId)
    .select('id, status, updated_at')
    .single();

  if (error) {
    // RLS on UPDATE doesn't raise 42501 like it does on INSERT -- a write the
    // policy denies just matches 0 rows, and .single() turns that into
    // PGRST116. We already confirmed the row exists above, so 0 rows here
    // means RLS blocked the write, not that the stage disappeared.
    if (error.code === '42501' || error.code === 'PGRST116') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'ต้องเป็น Org Admin เท่านั้น' } },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: updated }, { status: 200 });
}
