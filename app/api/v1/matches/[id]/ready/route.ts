import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { asUpdate, cleanIds } from '@/types/supabase-helpers';
import type { Database } from '@/types/database.types';

interface MatchReadyUpdatePayload {
  updated_at: string;
  team_a_ready_at?: string;
  team_b_ready_at?: string;
  status?: Database['public']['Enums']['match_status_type'];
  started_at?: string;
  forfeit_deadline_at?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const matchId = resolvedParams.id;

  // 1. ตรวจสอบ Authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. ดึง Player Profile ของ Caller
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!player) {
    return NextResponse.json({ error: 'Player profile not found' }, { status: 404 });
  }

  // 3. ดึงข้อมูล Match พร้อม veto_format จาก Stage
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select(`
      *,
      stage:tournament_stages(id, veto_format)
    `)
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (match.status !== 'SCHEDULED' && match.status !== 'READY_CHECK') {
    return NextResponse.json(
      { error: 'READY_CHECK_NOT_ALLOWED: Match is not in valid status' },
      { status: 422 }
    );
  }

  // 4. ตรวจสอบสิทธิ์ (ต้องเป็น CAPTAIN หรือ MANAGER ของ Team A หรือ Team B)
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('player_id', player.id)
    .eq('status', 'ACTIVE')
    .in('team_id', cleanIds(match.team_a_id, match.team_b_id))
    .in('role', ['CAPTAIN', 'MANAGER', 'OWNER']);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json(
      { error: 'Forbidden: You must be a Captain or Manager of a participating team' },
      { status: 403 }
    );
  }

  const userTeamId = memberships[0].team_id;
  const nowIso = new Date().toISOString();
  const isTeamA = userTeamId === match.team_a_id;

  const updatePayload: MatchReadyUpdatePayload = {
    updated_at: nowIso,
  };

  if (isTeamA) {
    updatePayload.team_a_ready_at = nowIso;
  } else {
    updatePayload.team_b_ready_at = nowIso;
  }

  const teamAReady = isTeamA ? true : Boolean(match.team_a_ready_at);
  const teamBReady = !isTeamA ? true : Boolean(match.team_b_ready_at);

  let nextStatus: Database['public']['Enums']['match_status_type'] = match.status;

  // 5. State Machine Transition Logic
  if (teamAReady && teamBReady) {
    const hasVetoFormat = Boolean(match.stage?.veto_format);
    nextStatus = hasVetoFormat ? 'VETO' : 'LIVE';
    updatePayload.status = nextStatus;
    if (nextStatus === 'LIVE') {
      updatePayload.started_at = nowIso;
    }
  } else {
    if (match.status === 'SCHEDULED') {
      nextStatus = 'READY_CHECK';
      updatePayload.status = nextStatus;
      if (!match.forfeit_deadline_at) {
        updatePayload.forfeit_deadline_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
    }
  }

  // 6. บันทึกข้อมูลแมตช์ผ่าน Admin Client
  const adminSupabase = await createAdminClient();
  const { data: updatedMatch, error: updateErr } = await adminSupabase
    .from('matches')
    .update(asUpdate<'matches'>(updatePayload))
    .eq('id', matchId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 7. บันทึก Audit Log ลง match_state_transitions หากสถานะมีการเปลี่ยน
  if (nextStatus !== match.status) {
    await adminSupabase.from('match_state_transitions').insert({
      match_id: match.id,
      from_status: match.status,
      to_status: nextStatus,
      trigger_source: 'PLAYER',
      actor_id: player.id,
      reason: `Team ${isTeamA ? 'A' : 'B'} confirmed ready`,
      state_snapshot: {
        team_a_ready_at: updatePayload.team_a_ready_at || match.team_a_ready_at,
        team_b_ready_at: updatePayload.team_b_ready_at || match.team_b_ready_at,
      },
    });
  }

  // 8. บรอดแคสต์สัญญาณไปที่แชนแนลเรียลไทม์เพื่อซิงค์หน้าจอ Overlay ทันที
  await adminSupabase.channel(`match-realtime-${matchId}`).send({
    type: 'broadcast',
    event: 'team_ready_checkin',
    payload: {
      match_id: matchId,
      team_id: userTeamId,
      team_tag: isTeamA ? 'TEAM_A' : 'TEAM_B',
      both_ready: teamAReady && teamBReady,
      next_status: nextStatus,
      forfeit_deadline_at: updatePayload.forfeit_deadline_at || match.forfeit_deadline_at,
    },
  });

  return NextResponse.json(updatedMatch);
}
