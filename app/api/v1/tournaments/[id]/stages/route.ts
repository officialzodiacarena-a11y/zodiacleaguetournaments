// GET /api/v1/tournaments/:id/stages
// T2.2-A02 — list stages of a tournament, ordered by stage_order.
// Public — tournament_stages and bracket_nodes both have public-read RLS
// (bracket_nodes: migration_block2_sprint2.2.sql; tournament_stages:
// rls_fix_public_reads.sql), so the regular RLS-respecting client is enough.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface BracketSummary {
  total_nodes: number;
  completed_nodes: number;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const includeBracket = request.nextUrl.searchParams.get('include') === 'bracket';

  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('id', tournamentId)
    .maybeSingle();

  if (!tournament) {
    return NextResponse.json(
      { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'ไม่พบทัวร์นาเมนต์นี้' } },
      { status: 404 }
    );
  }

  const { data: stages, error } = await supabase
    .from('tournament_stages')
    .select(
      'id, tournament_id, name, stage_order, format, status, teams_in, teams_advancing, start_at, end_at, created_at, updated_at'
    )
    .eq('tournament_id', tournamentId)
    .order('stage_order', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  if (!includeBracket || !stages || stages.length === 0) {
    return NextResponse.json({ data: stages ?? [] }, { status: 200 });
  }

  // "bracket summary" is node counts -- how many bracket_nodes exist for the
  // stage and how many are COMPLETED.
  const stageIds = stages.map((s) => s.id);
  const { data: nodes } = await supabase
    .from('bracket_nodes')
    .select('stage_id, status')
    .in('stage_id', stageIds);

  const summaryByStage = new Map<string, BracketSummary>();
  for (const n of nodes ?? []) {
    const summary = summaryByStage.get(n.stage_id) ?? { total_nodes: 0, completed_nodes: 0 };
    summary.total_nodes += 1;
    if (n.status === 'COMPLETED') summary.completed_nodes += 1;
    summaryByStage.set(n.stage_id, summary);
  }

  const data = stages.map((s) => ({
    ...s,
    bracket: summaryByStage.get(s.id) ?? { total_nodes: 0, completed_nodes: 0 },
  }));

  return NextResponse.json({ data }, { status: 200 });
}

const VALID_FORMATS = [
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'SWISS',
  'ROUND_ROBIN',
  'GROUP_STAGE',
  'GAUNTLET',
  'SHOWDOWN',
];

// POST /api/v1/tournaments/:id/stages
// T2.2-A03 — create a stage. Org Admin only -- enforced by RLS
// (tournament_stages_admin_write, is_admin()), not re-checked in app code:
// the insert runs on the caller's own session, so a non-admin's insert is
// rejected by Postgres itself (42501) before any row is written.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
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

  const { name, stage_order, format, teams_in, teams_advancing, format_config, best_of_config, map_pool, veto_format, start_at } = body;

  if (typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'name is required' } },
      { status: 400 }
    );
  }
  if (typeof stage_order !== 'number' || !Number.isInteger(stage_order) || stage_order <= 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'stage_order must be a positive integer' } },
      { status: 400 }
    );
  }
  if (typeof format !== 'string' || !VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `format must be one of: ${VALID_FORMATS.join(', ')}` } },
      { status: 400 }
    );
  }
  if (teams_in !== undefined && teams_in !== null && (typeof teams_in !== 'number' || teams_in <= 0)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'teams_in must be a positive integer' } },
      { status: 400 }
    );
  }
  if (
    teams_advancing !== undefined &&
    teams_advancing !== null &&
    (typeof teams_advancing !== 'number' || teams_advancing <= 0)
  ) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'teams_advancing must be a positive integer' } },
      { status: 400 }
    );
  }
  if (
    typeof teams_advancing === 'number' &&
    typeof teams_in === 'number' &&
    teams_advancing > teams_in
  ) {
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

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('id', tournamentId)
    .maybeSingle();
  if (!tournament) {
    return NextResponse.json(
      { error: { code: 'TOURNAMENT_NOT_FOUND', message: 'ไม่พบทัวร์นาเมนต์นี้' } },
      { status: 404 }
    );
  }

  const { data: stage, error } = await supabase
    .from('tournament_stages')
    .insert({
      tournament_id: tournamentId,
      name,
      stage_order,
      format,
      teams_in: teams_in ?? null,
      teams_advancing: teams_advancing ?? null,
      format_config: format_config ?? {},
      best_of_config: best_of_config ?? { default: 1 },
      map_pool: map_pool ?? null,
      veto_format: veto_format ?? {},
      start_at: start_at ?? null,
    })
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
    if (error.code === '42501') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'ต้องเป็น Org Admin เท่านั้น' } },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data: stage }, { status: 201 });
}
