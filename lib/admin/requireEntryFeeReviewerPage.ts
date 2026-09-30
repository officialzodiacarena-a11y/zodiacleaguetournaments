import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const ENTRY_FEE_REVIEWER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'REFEREE'] as const;

// Server Component gate for app/admin/entry-payments/* pages — mirrors
// lib/admin/requireMarketplaceAdminPage.ts but scoped to ENTRY_FEE_REVIEWER_ROLES
// (SUPER_ADMIN, ADMIN, REFEREE) matching is_admin() in the DB.
export async function requireEntryFeeReviewerPage(): Promise<{ role: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase.from('players').select('id').eq('user_id', user.id).maybeSingle();
  if (!player) redirect('/login');

  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null);

  const matchedRole = userRoles?.find((r) => (ENTRY_FEE_REVIEWER_ROLES as readonly string[]).includes(r.role));
  if (!matchedRole) redirect('/');

  return { role: matchedRole.role };
}
