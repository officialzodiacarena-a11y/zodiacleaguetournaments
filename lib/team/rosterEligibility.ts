import type { SupabaseClient } from '@supabase/supabase-js';

export interface RosterEligibilityResult {
  isComplete: boolean;
  requiredCount: number;
  activeCount: number;
  unverifiedPlayerIds: string[];
}

// ทีมพร้อมแข่ง เมื่อมีสมาชิกสถานะ ACTIVE ครบตามจำนวนของเกม (games.team_size)
// และผู้เล่นทุกคนมี game_account ของเกมนั้นที่ verification_status = 'VERIFIED' อย่างน้อย 1 บัญชี
export async function checkRosterEligibility(
  supabase: SupabaseClient,
  teamId: string,
  gameId: string
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

  const { data: verifiedAccounts } = await supabase
    .from('game_accounts')
    .select('player_id')
    .eq('game_id', gameId)
    .eq('verification_status', 'VERIFIED')
    .in('player_id', activePlayerIds);

  const verifiedPlayerIds = new Set(
    (verifiedAccounts ?? []).map((a: { player_id: string }) => a.player_id)
  );
  const unverifiedPlayerIds = activePlayerIds.filter((id) => !verifiedPlayerIds.has(id));

  return {
    isComplete: activePlayerIds.length >= requiredCount && unverifiedPlayerIds.length === 0,
    requiredCount,
    activeCount: activePlayerIds.length,
    unverifiedPlayerIds,
  };
}
