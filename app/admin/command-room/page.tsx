import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettlementErrorTable } from '@/components/admin/SettlementErrorTable';
import { EmergencyVoidPanel } from '@/components/admin/EmergencyVoidPanel';
import { SettlePoolPanel } from '@/components/admin/SettlePoolPanel';
import { computeStuckMinutes } from '@/lib/admin/stuckMinutes';

// Admin Command Room — Server-Side Rendered per spec (MASTER_SPEC___Stage2_P7_UI_UX.md):
// role check happens here, on the server, before anything renders. The
// client sub-components below still call the API routes (which re-check the
// role themselves — defense in depth) rather than any Server Action, since
// that's the layering already used by every admin-gated route in this repo.
// Desktop-only per spec (Admin Room ไม่รองรับ mobile ใน V1).
export default async function AdminCommandRoomPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: player } = await supabase.from('players').select('id').eq('user_id', user.id).maybeSingle();
  if (!player) redirect('/login');

  // Fetch every active role (not .maybeSingle()) — a player commonly holds
  // more than one concurrent, non-revoked role (e.g. the base ATHLETE role
  // plus ADMIN), and .maybeSingle() errors out on multiple rows, misreading
  // a real admin as roleless. Mirrors requireMarketplaceAdminPage.ts.
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('player_id', player.id)
    .is('revoked_at', null);

  const userRole = userRoles?.find((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r.role));
  if (!userRole) {
    redirect('/');
  }

  const { data: errorPools } = await supabase
    .from('prediction_pools')
    .select('id, match_id, status, updated_at')
    .eq('status', 'SETTLEMENT_ERROR')
    .order('updated_at', { ascending: true });

  const errorPoolRows = (errorPools ?? []).map((row) => ({
    pool_id: row.id,
    match_id: row.match_id,
    status: row.status,
    stuck_minutes: computeStuckMinutes(row.updated_at),
  }));

  return (
    <div className="min-h-screen bg-[#0D0E1A] p-8">
      <div className="mb-6 block md:hidden">
        <p className="text-sm text-[#94A3B8]">Admin Command Room รองรับเฉพาะหน้าจอ Desktop เท่านั้น</p>
      </div>

      <div className="hidden md:block">
        <h1 className="mb-1 text-2xl font-black text-[#F9EDD8]">Admin Command Room</h1>
        <p className="mb-6 text-sm text-[#94A3B8]">{userRole.role} · ทุก action ผ่าน Server-side RPC เท่านั้น</p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SettlePoolPanel />
          {userRole.role === 'SUPER_ADMIN' && <EmergencyVoidPanel />}

          <div className="rounded-xl bg-[#1A1C2E] p-5 lg:col-span-2">
            <h3 className="mb-3 text-sm font-bold text-[#F59E0B]">SETTLEMENT_ERROR Monitor ({errorPoolRows.length})</h3>
            <SettlementErrorTable initialPools={errorPoolRows} />
          </div>
        </div>
      </div>
    </div>
  );
}
