import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC Guard: Check if the requesting user is SUPER_ADMIN
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', user.id)
      .eq('role', 'SUPER_ADMIN')
      .single();

    if (!adminRole) {
      return NextResponse.json({ error: 'FORBIDDEN: Must be SUPER_ADMIN' }, { status: 403 });
    }

    const { targetUserId, action, role } = await request.json();

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get old role for audit logging
    const { data: currentRoleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('player_id', targetUserId)
      .single();
    
    const oldRole = currentRoleData?.role || 'NONE';

    if (action === 'ASSIGN') {
      if (!role) return NextResponse.json({ error: 'Role is required for ASSIGN' }, { status: 400 });
      
      const { error: upsertError } = await supabase
        .from('user_roles')
        .upsert({ player_id: targetUserId, role }, { onConflict: 'player_id' });
        
      if (upsertError) throw upsertError;

      // Audit Log
      // @ts-ignore: target_user_id was added directly via SQL, types not synced yet
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'GRANT',
        target_user_id: targetUserId,
        old_role: oldRole,
        new_role: role
      });

      return NextResponse.json({ success: true, message: `Assigned ${role}` });

    } else if (action === 'REVOKE') {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('player_id', targetUserId);

      if (deleteError) throw deleteError;

      // Audit Log
      // @ts-ignore: target_user_id was added directly via SQL, types not synced yet
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'REVOKE',
        target_user_id: targetUserId,
        old_role: oldRole,
        new_role: 'NONE'
      });

      return NextResponse.json({ success: true, message: 'Role revoked' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Role API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
