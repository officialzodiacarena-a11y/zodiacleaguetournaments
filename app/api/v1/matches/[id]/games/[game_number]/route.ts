import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; game_number: string }> | { id: string; game_number: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;
  const gameNumber = parseInt(resolvedParams.game_number);

  const { data, error } = await supabase
    .from('match_games')
    .select(`
      *,
      match_participants(*)
    `)
    .eq('match_id', matchId)
    .eq('game_number', gameNumber)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; game_number: string }> | { id: string; game_number: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;
  const gameNumber = parseInt(resolvedParams.game_number);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ห้ามแก้ผลแมปถ้าแมตช์หลัก COMPLETED แล้ว
  const { data: match } = await supabase
    .from('matches')
    .select('status')
    .eq('id', matchId)
    .single();

  if (match?.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'MATCH_ALREADY_COMPLETED: Cannot edit game results after match is completed' },
      { status: 422 }
    );
  }

  const body = await request.json();
  const adminSupabase = await createAdminClient();

  const { data: updatedGame, error: updateErr } = await adminSupabase
    .from('match_games')
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq('match_id', matchId)
    .eq('game_number', gameNumber)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json(updatedGame);
}
