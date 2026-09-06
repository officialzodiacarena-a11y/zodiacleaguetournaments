import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  if (status) query = query.eq('status', status);
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
