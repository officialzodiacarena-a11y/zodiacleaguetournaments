// PATCH /api/v1/stages/:id
// T2.2-A04 (part 1) — edit stage config. Only allowed while status = PENDING.
// Org Admin only, enforced by RLS (tournament_stages_admin_write).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_FORMATS = [
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'SWISS',
  'ROUND_ROBIN',
  'GROUP_STAGE',
  'GAUNTLET',
  'SHOWDOWN',
];

const EDITABLE_FIELDS = [
  'name',
  'stage_order',
  'format',
  'teams_in',
  'teams_advancing',
  'format_config',
  'best_of_config',
  'map_pool',
  'veto_format',
  'start_at',
  'end_at',
] as const;

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

  if (stage.status !== 'PENDING') {
    return NextResponse.json(
      {
        error: {
          code: 'STAGE_ALREADY_STARTED',
          message: 'แก้ไข stage ได้เฉพาะตอนที่ยังเป็นสถานะ PENDING',
        },
      },
      { status: 422 }
    );
  }

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ไม่มีฟิลด์ที่แก้ไข' } },
      { status: 400 }
    );
  }

  if ('format' in patch && (typeof patch.format !== 'string' || !VALID_FORMATS.includes(patch.format))) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `format must be one of: ${VALID_FORMATS.join(', ')}` } },
      { status: 400 }
    );
  }
  if ('stage_order' in patch && (typeof patch.stage_order !== 'number' || !Number.isInteger(patch.stage_order) || patch.stage_order <= 0)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'stage_order must be a positive integer' } },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from('tournament_stages')
    .update(patch)
    .eq('id', stageId)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_STAGE_ORDER', message: 'stage_order นี้ถูกใช้ในทัวร์นาเมนต์นี้แล้ว' } },
        { status: 409 }
      );
    }
    if (error.code === '23514') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ADVANCEMENT_CONFIG',
            message: 'teams_advancing ต้องน้อยกว่าหรือเท่ากับ teams_in',
          },
        },
        { status: 422 }
      );
    }
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
