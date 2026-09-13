// app/api/v1/stages/[id]/route.ts
// PATCH /api/v1/stages/:id
// T2.2-A04 (part 1) — edit stage config. Only allowed while status = PENDING.
// Org Admin only, enforced by RLS (tournament_stages_admin_write).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.types';

const VALID_FORMATS = [
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'SWISS',
  'ROUND_ROBIN',
  'GROUP_STAGE',
  'GAUNTLET',
  'SHOWDOWN',
] as const;

type StageFormat = (typeof VALID_FORMATS)[number];

interface StageUpdatePayload {
  name?: string;
  stage_order?: number;
  format?: StageFormat;
  teams_in?: number | null;
  teams_advancing?: number | null;
  format_config?: Json;
  best_of_config?: Json;
  map_pool?: string[] | null;
  veto_format?: Json;
  start_at?: string | null;
  end_at?: string | null;
}

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
    body = (await request.json()) as Record<string, unknown>;
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

  if ('format' in body && (typeof body.format !== 'string' || !VALID_FORMATS.includes(body.format as StageFormat))) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `format must be one of: ${VALID_FORMATS.join(', ')}` } },
      { status: 400 }
    );
  }

  if (
    'stage_order' in body &&
    (typeof body.stage_order !== 'number' || !Number.isInteger(body.stage_order) || body.stage_order <= 0)
  ) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'stage_order must be a positive integer' } },
      { status: 400 }
    );
  }

  const patch: StageUpdatePayload = {};

  if (typeof body.name === 'string') patch.name = body.name;
  if (typeof body.stage_order === 'number') patch.stage_order = body.stage_order;
  if (typeof body.format === 'string') patch.format = body.format as StageFormat;
  if ('teams_in' in body) patch.teams_in = (body.teams_in as number | null) ?? null;
  if ('teams_advancing' in body) patch.teams_advancing = (body.teams_advancing as number | null) ?? null;
  if ('format_config' in body) patch.format_config = body.format_config as Json;
  if ('best_of_config' in body) patch.best_of_config = body.best_of_config as Json;
  if ('map_pool' in body) patch.map_pool = Array.isArray(body.map_pool) ? (body.map_pool as string[]) : null;
  if ('veto_format' in body) patch.veto_format = body.veto_format as Json;
  if ('start_at' in body) patch.start_at = typeof body.start_at === 'string' ? body.start_at : null;
  if ('end_at' in body) patch.end_at = typeof body.end_at === 'string' ? body.end_at : null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ไม่มีฟิลด์ที่แก้ไข' } },
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