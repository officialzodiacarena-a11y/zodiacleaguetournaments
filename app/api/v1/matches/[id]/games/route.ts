import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;

  const { data, error } = await supabase
    .from('match_games')
    .select(`
      *,
      match_participants(*)
    `)
    .eq('match_id', matchId)
    .order('game_number', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    game_number,
    map_name,
    team_a_side_start,
    team_b_side_start,
    score_a,
    score_b,
    winner_team_id,
    went_overtime,
    started_at,
    ended_at,
    duration_seconds,
    external_game_id,
  } = body;

  if (!game_number) {
    return NextResponse.json({ error: 'game_number is required' }, { status: 400 });
  }

  // 1. ตรวจสอบสถานะและ best_of ของ Match
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, status, best_of, team_a_id, team_b_id')
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (game_number > match.best_of) {
    return NextResponse.json(
      { error: 'EXCEEDS_BEST_OF: game_number exceeds match best_of' },
      { status: 422 }
    );
  }

  const adminSupabase = await createAdminClient();

  // 2. บันทึก Game ผลรายแมป
  const { data: newGame, error: insertErr } = await adminSupabase
    .from('match_games')
    .insert({
      match_id: matchId,
      game_number,
      map_name,
      team_a_side_start,
      team_b_side_start,
      score_a: score_a ?? 0,
      score_b: score_b ?? 0,
      winner_team_id: winner_team_id ?? null,
      went_overtime: Boolean(went_overtime),
      started_at: started_at ?? null,
      ended_at: ended_at ?? null,
      duration_seconds: duration_seconds ?? null,
      external_game_id: external_game_id ?? null,
      status: 'COMPLETED',
    })
    .select()
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json(
        { error: 'GAME_ALREADY_REPORTED: game_number already exists for this match' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // ปรับ Match สถานะเป็น AWAITING_RESULT หาก Match กำลัง LIVE อยู่
  if (match.status === 'LIVE' || match.status === 'VETO') {
    await adminSupabase
      .from('matches')
      .update({ status: 'AWAITING_RESULT', updated_at: new Date().toISOString() })
      .eq('id', matchId);
  }

  return NextResponse.json(newGame, { status: 201 });
}
