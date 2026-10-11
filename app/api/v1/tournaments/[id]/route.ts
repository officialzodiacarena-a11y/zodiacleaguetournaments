import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole } from '@/lib/admin/requireAdminRole';
import { Constants, type Database } from '@/types/database.types';

type MatchStatus = Database['public']['Enums']['match_status_type'];
const MATCH_STATUSES = Constants.public.Enums.match_status_type as readonly MatchStatus[];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const tournamentId = resolvedParams.id;
  const { searchParams } = new URL(request.url);
  
  const stageId = searchParams.get('stage_id');
  const status = searchParams.get('status');
  const teamId = searchParams.get('team_id');
  const date = searchParams.get('date');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('matches')
    .select(`
      *,
      team_a:teams!matches_team_a_id_fkey(id, name, tag, logo_url),
      team_b:teams!matches_team_b_id_fkey(id, name, tag, logo_url)
    `, { count: 'exact' })
    .eq('tournament_id', tournamentId);

  if (stageId) query = query.eq('stage_id', stageId);
  if (status && MATCH_STATUSES.includes(status as MatchStatus)) {
    query = query.eq('status', status as MatchStatus);
  }
  if (teamId) {
    query = query.or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`);
  }
  if (date) {
    query = query.gte('scheduled_at', `${date}T00:00:00Z`)
                 .lte('scheduled_at', `${date}T23:59:59Z`);
  }

  const { data, error, count } = await query
    .order('scheduled_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: { total: count, page, limit }
  });
}

// สวิตช์ "ทัวร์นี้ให้ EXP" (tournaments.exp_enabled) · รับเฉพาะ exp_enabled · ไม่แตะ exp_config / roster_check
// สิทธิ์: ADMIN / SUPER_ADMIN เท่านั้น (ไม่ใช่ REFEREE)
const EXP_SWITCH_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;
const PatchExpSwitchSchema = z.object({ exp_enabled: z.boolean() }).strict();
const LINKED_EXP_MESSAGE = 'ทัวร์ที่ตรวจรายชื่อแบบ LINKED (ทัวร์แยกของพี่ไอซ์) เปิด EXP ไม่ได้';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: tournamentId } = await params;
    const supabase = await createClient();
    const gate = await requireAdminRole(supabase, EXP_SWITCH_ROLES);
    if ('error' in gate) return gate.error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'รูปแบบ JSON Payload ไม่ถูกต้อง' } }, { status: 400 });
    }
    const parsed = PatchExpSwitchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ส่งได้เฉพาะ exp_enabled (true/false)' } },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: current } = await admin
      .from('tournaments')
      .select('id, roster_check')
      .eq('id', tournamentId)
      .maybeSingle();
    if (!current) {
      return NextResponse.json({ error: { code: 'TOURNAMENT_NOT_FOUND', message: 'ไม่พบทัวร์นี้ในระบบ' } }, { status: 404 });
    }
    if (parsed.data.exp_enabled && current.roster_check === 'LINKED') {
      return NextResponse.json({ error: { code: 'EXP_NOT_ALLOWED_LINKED', message: LINKED_EXP_MESSAGE } }, { status: 409 });
    }

    const { data: updated, error } = await admin
      .from('tournaments')
      .update({ exp_enabled: parsed.data.exp_enabled })
      .eq('id', tournamentId)
      .select('id, exp_enabled')
      .maybeSingle();

    if (error) {
      // กันซ้ำที่ฐานข้อมูล: CHECK tournaments_exp_not_with_linked_roster_check
      if (error.code === '23514' || error.message.includes('tournaments_exp_not_with_linked_roster_check')) {
        return NextResponse.json({ error: { code: 'EXP_NOT_ALLOWED_LINKED', message: LINKED_EXP_MESSAGE } }, { status: 409 });
      }
      return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: error.message } }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: { code: 'TOURNAMENT_NOT_FOUND', message: 'ไม่พบทัวร์นี้ในระบบ' } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message } }, { status: 500 });
  }
}
