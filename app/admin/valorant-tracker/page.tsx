// app/admin/valorant-tracker/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ValorantTrackerClient, { type VerificationItem } from './ValorantTrackerClient';

export const dynamic = 'force-dynamic';

interface GameAccountQueryRow {
  id: string;
  player_id: string;
  game_id: string;
  game_name: string | null;
  tag_line: string | null;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SELF_DECLARED' | 'MANUAL_REVIEW';
  evidence_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  player: {
    handle: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | {
    handle: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }[] | null;
}

export default async function ValorantTrackerPage() {
  const supabase = await createClient();

  // 1. RBAC Guard: ตรวจสอบ Session และ Player Profile
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!player) {
    redirect('/?error=unauthorized_admin_access');
  }

  // ดึงบทบาทจาก user_roles ผ่าน player_id ที่ยังไม่ถูก revoke
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null);

  const roles = (userRoles ?? []).map((r) => r.role);
  const isAuthorized = roles.some((role) => 
    ['SUPER_ADMIN', 'ADMIN', 'REFEREE'].includes(role)
  );

  if (!isAuthorized) {
    redirect('/?error=unauthorized_admin_access');
  }

  // 2. Pre-fetch Verification Requests
  const { data: verificationRows, error: fetchError } = await supabase
    .from('game_accounts')
    .select(`
      id,
      player_id,
      game_id,
      game_name,
      tag_line,
      verification_status,
      evidence_url,
      rejection_reason,
      created_at,
      updated_at,
      player:players (
        handle,
        full_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('[UI-AD02] Failed to fetch verifications:', fetchError);
  }

  const typedRows = (verificationRows ?? []) as unknown as GameAccountQueryRow[];

  const initialItems: VerificationItem[] = typedRows.map((row) => ({
    id: row.id,
    player_id: row.player_id,
    game_id: row.game_id,
    game_name: row.game_name,
    tag_line: row.tag_line,
    verification_status: row.verification_status,
    evidence_url: row.evidence_url,
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    player: Array.isArray(row.player) ? row.player[0] ?? null : row.player ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#0D0E1A] text-[#F9EDD8] font-sans p-6 md:p-10 select-none">
      <div className="max-w-7xl mx-auto">
        <ValorantTrackerClient initialItems={initialItems} />
      </div>
    </main>
  );
}
