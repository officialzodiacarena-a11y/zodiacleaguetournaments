import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireBroadcastRole } from '@/lib/auth/require-broadcast-role';
import { loadSeriesState } from '@/lib/overlay/match-series';
import { planAfterGameRecorded } from '@/lib/overlay/series-flow';
import { asUpdate } from '@/types/supabase-helpers';
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

  // บันทึกผลเกม/สถิติผู้เล่น: เฉพาะ REFEREE / ADMIN / SUPER_ADMIN (เดิมตรวจแค่ล็อกอิน แล้วเขียนด้วย admin client)
  const auth = await requireBroadcastRole(supabase);
  if (!auth.ok) return auth.response;

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

  // ปรับสถานะเป็น AWAITING_RESULT เฉพาะเมื่อซีรีส์ตัดสินผลครบแล้ว (ชนะครบ / ครบ best_of) ตามสเปก T2.3-C01
  // ระหว่างซีรีส์ต้องคงสถานะ LIVE ไว้ เพราะ trigger ใน DB ไม่ให้ AWAITING_RESULT กลับเป็น LIVE (ไปได้แค่ COMPLETED / DISPUTED)
  // ฉาก Overlay ระหว่างเกมจำไว้ใน format_config.overlay_scene (ผูกกับจำนวนเกมที่จบแล้ว)
  const state = await loadSeriesState(adminSupabase, matchId);
  if (state) {
    const matchUpdate = planAfterGameRecorded(state, new Date().toISOString());
    if (matchUpdate) {
      await adminSupabase.from('matches').update(asUpdate<'matches'>(matchUpdate)).eq('id', matchId);
    }
  }

  return NextResponse.json(newGame, { status: 201 });
}
