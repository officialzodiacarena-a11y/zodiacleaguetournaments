import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MARKETPLACE_ADMIN_ROLES } from '@/lib/admin/requireAdminRole';

// Server Component gate for app/admin/marketplace/* pages — mirrors the
// inline check in app/admin/command-room/page.tsx but fetches every active
// role (not .maybeSingle()) so a player holding more than one role isn't
// misread as roleless. MARKETPLACE_ADMIN must never be added to Command
// Room's own allow-list — that isolation (Gate D4) is what keeps this role
// scoped to the marketplace only.
export async function requireMarketplaceAdminPage(): Promise<{ role: string }> {
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

  const matchedRole = userRoles?.find((r) => (MARKETPLACE_ADMIN_ROLES as readonly string[]).includes(r.role));
  if (!matchedRole) redirect('/');

  return { role: matchedRole.role };
}
