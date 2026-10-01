// actions/team.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRosterEligibility } from '@/lib/team/rosterEligibility';

export type ActionResult = { success: true; teamId?: string } | { error: { code: string; message: string } };

const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export async function createTeamAction(formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim();
  const tag = (formData.get('tag') as string | null)?.trim().toUpperCase();
  const description = (formData.get('description') as string | null)?.trim() || null;
  let logoUrl = (formData.get('logoUrl') as string | null)?.trim() || null;
  const logoFile = formData.get('logoFile') as File | null;

  if (!name || name.length < 2 || name.length > 50) {
    return { error: { code: 'INVALID_NAME', message: 'ชื่อทีมต้องมีความยาวระหว่าง 2-50 ตัวอักษร' } };
  }
  if (!tag || tag.length < 2 || tag.length > 6) {
    return { error: { code: 'INVALID_TAG', message: 'แท็กทีม (Team Tag) ต้องมีความยาวระหว่าง 2-6 ตัวอักษร' } };
  }

  const supabase = await createClient();
  const actor = await getCurrentPlayer(supabase);
  if (!actor) {
    return { error: { code: 'UNAUTHENTICATED', message: 'กรุณาเข้าสู่ระบบก่อนสร้างทีม' } };
  }

  // Get active game
  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (!game) {
    return { error: { code: 'GAME_NOT_FOUND', message: 'ไม่พบเกมที่เปิดใช้งานในระบบ' } };
  }

  // Check if player is already captain of an active team in this game
  const { data: existingCaptainTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('captain_id', actor.id)
    .eq('game_id', game.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingCaptainTeam) {
    return { error: { code: 'ALREADY_CAPTAIN', message: 'คุณเป็นกัปตันของทีมในเกมนี้อยู่แล้ว (1 คนสร้างได้ 1 ทีมต่อเกม)' } };
  }

  // Generate unique slug
  const admin = createAdminClient();

  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: { code: 'FILE_TOO_LARGE', message: 'ขนาดไฟล์โลโก้ต้องไม่เกิน 2MB' } };
    }
    
    const fileExt = logoFile.name.split('.').pop() || 'png';
    const fileName = `team_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const path = `logos/${fileName}`;
    
    const { error: uploadError } = await admin.storage
      .from('team-logos')
      .upload(path, Buffer.from(await logoFile.arrayBuffer()), { contentType: logoFile.type, upsert: false });
      
    if (uploadError) {
      return { error: { code: 'UPLOAD_FAILED', message: `อัปโหลดโลโก้ไม่สำเร็จ: ${uploadError.message}` } };
    }
    
    const { data: publicUrlData } = admin.storage.from('team-logos').getPublicUrl(path);
    logoUrl = publicUrlData.publicUrl;
  }

  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || tag.toLowerCase();
  const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  const { data: newTeam, error: createError } = await admin
    .from('teams')
    .insert({
      name,
      tag,
      slug,
      description,
      logo_url: logoUrl,
      game_id: game.id,
      captain_id: actor.id,
      is_active: true,
      is_locked: false,
      wins: 0,
      losses: 0,
      total_zp: 0,
    })
    .select('id')
    .single();

  if (createError || !newTeam) {
    return { error: { code: 'CREATE_FAILED', message: createError?.message ?? 'สร้างทีมไม่สำเร็จ' } };
  }

  // Add captain as ACTIVE team member
  const { error: memberError } = await admin.from('team_members').insert({
    team_id: newTeam.id,
    player_id: actor.id,
    role: 'CAPTAIN',
    status: 'ACTIVE',
  });

  if (memberError) {
    return { error: { code: 'MEMBER_ADD_FAILED', message: memberError.message } };
  }

  revalidatePath('/profile');
  revalidatePath(`/teams/${newTeam.id}`);
  return { success: true, teamId: newTeam.id };
}

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
