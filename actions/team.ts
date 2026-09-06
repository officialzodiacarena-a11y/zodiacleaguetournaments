// actions/team.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRosterEligibility } from '@/lib/team/rosterEligibility';

export type ActionResult = { success: true } | { error: { code: string; message: string } };

const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

async function getCurrentPlayer(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return player as { id: string } | null;
}

export async function invitePlayerAction(teamId: string, formData: FormData): Promise<ActionResult> {
  const identifier = (formData.get('identifier') as string | null)?.trim();
  if (!identifier || !/^[A-Za-z0-9_-]+$/.test(identifier)) {
    return { error: { code: 'INVALID_IDENTIFIER', message: 'กรุณาระบุ Athlete ID หรือ Slug ของผู้เล่นให้ถูกต้อง' } };
  }

  const supabase = await createClient();
  const actor = await getCurrentPlayer(supabase);
  if (!actor) {
    return { error: { code: 'UNAUTHENTICATED', message: 'กรุณาเข้าสู่ระบบก่อน' } };
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, game_id, captain_id')
    .eq('id', teamId)
    .single();

  if (!team) {
    return { error: { code: 'TEAM_NOT_FOUND', message: 'ไม่พบทีมนี้' } };
  }
  if (team.captain_id !== actor.id) {
    return { error: { code: 'FORBIDDEN', message: 'เฉพาะ Captain เท่านั้นที่เชิญผู้เล่นได้' } };
  }

  const { data: target } = await supabase
    .from('players')
    .select('id')
    .or(`athlete_id.eq.${identifier},slug.eq.${identifier}`)
    .maybeSingle();

  if (!target) {
    return { error: { code: 'PLAYER_NOT_FOUND', message: `ไม่พบผู้เล่น "${identifier}"` } };
  }

  // เช็ค: ผู้เล่นอยู่ทีมอื่นในเกมเดียวกันอยู่แล้วหรือไม่ (1 คน = 1 ทีมต่อเกม)
  const { data: activeMemberships } = await supabase
    .from('team_members')
    .select('team_id, teams(game_id)')
    .eq('player_id', target.id)
    .eq('status', 'ACTIVE');

  const alreadyRosteredSameGame = (activeMemberships ?? []).some((m) => {
    const joinedTeam = Array.isArray(m.teams) ? m.teams[0] : m.teams;
    return joinedTeam?.game_id === team.game_id;
  });

  if (alreadyRosteredSameGame) {
    return { error: { code: 'PLAYER_ALREADY_ROSTERED', message: 'ผู้เล่นคนนี้อยู่ทีมอื่นในเกมเดียวกันแล้ว' } };
  }

  // Idempotent: ถ้ามีคำเชิญที่ยังไม่หมดอายุ (ภายใน 48 ชม.) อยู่แล้ว ไม่ต้องส่งซ้ำ
  const { data: pendingInvite } = await supabase
    .from('team_members')
    .select('id, created_at')
    .eq('team_id', teamId)
    .eq('player_id', target.id)
    .eq('status', 'INVITED')
    .maybeSingle();

  const isPendingInviteStillValid =
    !!pendingInvite && Date.now() - new Date(pendingInvite.created_at).getTime() < INVITE_TTL_MS;

  if (!isPendingInviteStillValid) {
    const { error: insertError } = await supabase.from('team_members').insert({
      team_id: teamId,
      player_id: target.id,
      role: 'PLAYER',
      status: 'INVITED',
    });

    if (insertError) {
      return { error: { code: 'INVITE_FAILED', message: insertError.message } };
    }

    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      action: 'CREATE',
      entity_type: 'team_members',
      entity_id: target.id,
      after_data: { team_id: teamId, status: 'INVITED' },
    });

    await supabase.from('notifications').insert({
      player_id: target.id,
      type: 'TEAM_INVITE',
      title: 'คุณได้รับคำเชิญเข้าทีม',
      body: 'มีทีมเชิญคุณเข้าร่วม roster — คำเชิญหมดอายุใน 48 ชั่วโมง',
      action_url: `/teams/${teamId}`,
    });
  }

  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}

export async function lockRosterAction(teamId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const actor = await getCurrentPlayer(supabase);
  if (!actor) {
    return { error: { code: 'UNAUTHENTICATED', message: 'กรุณาเข้าสู่ระบบก่อน' } };
  }

  const { data: team } = await supabase
    .from('teams')
    .select('id, game_id, captain_id, is_locked')
    .eq('id', teamId)
    .single();

  if (!team) {
    return { error: { code: 'TEAM_NOT_FOUND', message: 'ไม่พบทีมนี้' } };
  }
  if (team.captain_id !== actor.id) {
    return { error: { code: 'FORBIDDEN', message: 'เฉพาะ Captain เท่านั้นที่ล็อก Roster ได้' } };
  }

  // teams.is_locked ทำหน้าที่เป็น idempotency guard (ตารางนี้ไม่มีคอลัมน์ idempotency_key)
  if (team.is_locked) {
    return { success: true };
  }

  const eligibility = await checkRosterEligibility(supabase, teamId, team.game_id);
  if (!eligibility.isComplete) {
    return {
      error: {
        code: 'TEAM_ROSTER_INCOMPLETE',
        message: `ทีมต้องมีสมาชิกครบ ${eligibility.requiredCount} คนและยืนยันตัวตนครบทุกคน (ปัจจุบัน ${eligibility.activeCount} คน)`,
      },
    };
  }

  const { data: activeMembers } = await supabase
    .from('team_members')
    .select('player_id, role')
    .eq('team_id', teamId)
    .eq('status', 'ACTIVE');

  const { data: snapshot, error: snapshotError } = await supabase
    .from('roster_snapshots')
    .insert({ team_id: teamId })
    .select('id')
    .single();

  if (snapshotError || !snapshot) {
    return { error: { code: 'SNAPSHOT_FAILED', message: snapshotError?.message ?? 'สร้าง roster snapshot ไม่สำเร็จ' } };
  }

  const memberRows = ((activeMembers ?? []) as { player_id: string; role: string }[]).map((m) => ({
    snapshot_id: snapshot.id,
    player_id: m.player_id,
    // หมายเหตุ: สคีมาปัจจุบันยังไม่มีฟิลด์เก็บตำแหน่งในเกม (DUELIST/INITIATOR/...)
    // ใช้ team_role_type ของ team_members ไปก่อนจนกว่าจะเพิ่ม field ตำแหน่งจริงใน sprint ถัดไป
    role: m.role,
  }));

  if (memberRows.length > 0) {
    await supabase.from('roster_snapshot_members').insert(memberRows);
  }

  // teams RLS (Block 1) มีแค่ teams_public_read — ไม่มี policy ให้ captain UPDATE ได้
  // ใช้ service role เฉพาะขั้นตอนนี้ หลังเช็คสิทธิ์ captain ด้วยตัวเองข้างบนแล้ว
  const admin = createAdminClient();
  const { error: lockError } = await admin.from('teams').update({ is_locked: true }).eq('id', teamId);

  if (lockError) {
    return { error: { code: 'LOCK_FAILED', message: lockError.message } };
  }

  await supabase.from('audit_logs').insert({
    actor_id: actor.id,
    action: 'CREATE',
    entity_type: 'roster_snapshots',
    entity_id: snapshot.id,
    after_data: { team_id: teamId, member_count: memberRows.length },
  });

  revalidatePath(`/teams/${teamId}`);
  return { success: true };
}
