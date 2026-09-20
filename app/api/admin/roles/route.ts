import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Resolve Player ID from Auth User ID
    const { data: player } = await adminSupabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const requestingPlayerId = player?.id;

    // RBAC Guard: Check if the requesting user or player is SUPER_ADMIN
    const { data: adminRole } = await adminSupabase
      .from('user_roles')
      .select('role')
      .in('player_id', [user.id, ...(requestingPlayerId ? [requestingPlayerId] : [])])
      .eq('role', 'SUPER_ADMIN')
      .maybeSingle();

    if (!adminRole) {
      return NextResponse.json({ error: 'FORBIDDEN: Must be SUPER_ADMIN' }, { status: 403 });
    }

    const { targetUserId, action, role } = await request.json();

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get old role for audit logging
    const { data: currentRoleData } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('player_id', targetUserId)
      .maybeSingle();
    
    const oldRole = currentRoleData?.role || 'NONE';

    if (action === 'ASSIGN') {
      if (!role) return NextResponse.json({ error: 'Role is required for ASSIGN' }, { status: 400 });
      
      const { error: upsertError } = await adminSupabase
        .from('user_roles')
        .upsert({ player_id: targetUserId, role }, { onConflict: 'player_id, role' });
        
      if (upsertError) throw upsertError;

      // Audit Log
      await adminSupabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'GRANT',
        // @ts-expect-error: target_user_id was added directly via SQL, types not synced yet
        target_user_id: targetUserId,
        old_role: oldRole,
        new_role: role
      });

      return NextResponse.json({ success: true, message: `Assigned ${role}` });

    } else if (action === 'REVOKE') {
      const { error: deleteError } = await adminSupabase
        .from('user_roles')
        .delete()
        .eq('player_id', targetUserId);

      if (deleteError) throw deleteError;

      // Audit Log
      await adminSupabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'REVOKE',
        // @ts-expect-error: target_user_id was added directly via SQL, types not synced yet
        target_user_id: targetUserId,
        old_role: oldRole,
        new_role: 'NONE'
      });

      return NextResponse.json({ success: true, message: 'Role revoked' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: unknown) {
    console.error('Role API Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
