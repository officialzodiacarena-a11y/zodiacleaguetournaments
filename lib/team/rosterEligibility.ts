import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export type RosterCheckMode = 'VERIFIED' | 'LINKED';

export interface RosterEligibilityResult {
  isComplete: boolean;
  requiredCount: number;
  activeCount: number;
  unverifiedPlayerIds: string[];
}

// ทีมพร้อมแข่ง เมื่อมีสมาชิกสถานะ ACTIVE ครบตามจำนวนของเกม (games.team_size) และผู้เล่นทุกคนผ่านเงื่อนไขตาม mode:
// - VERIFIED (ค่าเริ่มต้น · ทัวร์ซีซั่น/รายอาทิตย์ของเรา): มี game_account ของเกมนั้นที่ verification_status = 'VERIFIED' อย่างน้อย 1 บัญชี
// - LINKED (ทัวร์แยก เช่น Zodiac League): แค่มี game_account ของเกมนั้นที่ deleted_at is null และสถานะไม่ใช่ REJECTED/REVOKED
export async function checkRosterEligibility(
  supabase: SupabaseClient,
  teamId: string,
  gameId: string,
  mode: RosterCheckMode = 'VERIFIED'
): Promise<RosterEligibilityResult> {
  const [{ data: game }, { data: members }] = await Promise.all([
    supabase.from('games').select('team_size').eq('id', gameId).single(),
    supabase.from('team_members').select('player_id').eq('team_id', teamId).eq('status', 'ACTIVE'),
  ]);

  const requiredCount: number = game?.team_size ?? 5;
  const activePlayerIds: string[] = (members ?? []).map((m: { player_id: string }) => m.player_id);

  if (activePlayerIds.length === 0) {
    return { isComplete: false, requiredCount, activeCount: 0, unverifiedPlayerIds: [] };
  }

  let passedPlayerIds: Set<string>;

  if (mode === 'LINKED') {
    const admin = createAdminClient();
    const { data: linkedAccounts } = await admin
      .from('game_accounts')
      .select('player_id')
      .eq('game_id', gameId)
      .is('deleted_at', null)
      .not('verification_status', 'in', '(REJECTED,REVOKED)')
      .in('player_id', activePlayerIds);

    passedPlayerIds = new Set((linkedAccounts ?? []).map((a: { player_id: string }) => a.player_id));
  } else {
    const { data: verifiedAccounts } = await supabase
      .from('game_accounts')
      .select('player_id')
      .eq('game_id', gameId)
      .eq('verification_status', 'VERIFIED')
      .in('player_id', activePlayerIds);

    passedPlayerIds = new Set((verifiedAccounts ?? []).map((a: { player_id: string }) => a.player_id));
  }

  const unverifiedPlayerIds = activePlayerIds.filter((id) => !passedPlayerIds.has(id));

  return {
    isComplete: activePlayerIds.length >= requiredCount && unverifiedPlayerIds.length === 0,
    requiredCount,
    activeCount: activePlayerIds.length,
    unverifiedPlayerIds,
  };
}
