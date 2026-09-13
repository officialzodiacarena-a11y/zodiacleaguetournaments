// app/api/v1/tournaments/[id]/stages/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database, Json } from '@/types/database.types';

type TournamentStageInsert = Database['public']['Tables']['tournament_stages']['Insert'];
type StageFormat = Database['public']['Tables']['tournament_stages']['Row']['format'];

const VALID_FORMATS: readonly StageFormat[] = [
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'SWISS',
  'ROUND_ROBIN',
  'GROUP_STAGE',
  'GAUNTLET',
  'SHOWDOWN',
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const tournamentId = resolvedParams.id;
    const supabase = await createClient();

    const { data: stages, error } = await supabase
      .from('tournament_stages')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('stage_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: stages ?? [] }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const tournamentId = resolvedParams.id;
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

    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name is required' } },
        { status: 400 }
      );
    }

    if (typeof body.format !== 'string' || !VALID_FORMATS.includes(body.format as StageFormat)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `format must be one of: ${VALID_FORMATS.join(', ')}` } },
        { status: 400 }
      );
    }

    const payload: TournamentStageInsert = {
      tournament_id: tournamentId,
      name: body.name.trim(),
      stage_order: typeof body.stage_order === 'number' ? body.stage_order : 1,
      format: body.format as StageFormat,
      teams_in: typeof body.teams_in === 'number' ? body.teams_in : null,
      teams_advancing: typeof body.teams_advancing === 'number' ? body.teams_advancing : null,
      format_config: (body.format_config ?? {}) as unknown as Json,
      best_of_config: (body.best_of_config ?? { default: 1 }) as unknown as Json,
      map_pool: Array.isArray(body.map_pool) ? (body.map_pool as string[]) : null,
      veto_format: (body.veto_format ?? {}) as unknown as Json,
      start_at: typeof body.start_at === 'string' ? body.start_at : null,
      end_at: typeof body.end_at === 'string' ? body.end_at : null,
      status: 'PENDING',
    };

    const { data: created, error } = await supabase
      .from('tournament_stages')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}