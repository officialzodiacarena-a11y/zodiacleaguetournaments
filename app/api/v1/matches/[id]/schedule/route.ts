import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
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
  const { scheduled_at, reschedule_reason } = body;

  if (!scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 });
  }

  const { data: currentMatch, error: fetchErr } = await supabase
    .from('matches')
    .select('id, status, scheduled_at')
    .eq('id', matchId)
    .single();

  if (fetchErr || !currentMatch) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (currentMatch.status !== 'SCHEDULED') {
    return NextResponse.json(
      { error: 'CANNOT_RESCHEDULE: Match is not in SCHEDULED status' }, 
      { status: 422 }
    );
  }

  const adminSupabase = await createAdminClient();
  const { data: updatedMatch, error: updateErr } = await adminSupabase
    .from('matches')
    .update({
      scheduled_at,
      rescheduled_from: currentMatch.scheduled_at,
      reschedule_reason: reschedule_reason || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', matchId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json(updatedMatch);
}
