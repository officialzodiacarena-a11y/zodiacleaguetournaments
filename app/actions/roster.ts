// app/actions/roster.ts
'use server';

import { createClient as createServerUserClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function lockTeamRoster(teamId: string) {
  const supabaseUser = await createServerUserClient();
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    throw new Error('UNAUTHORIZED');
  }

  const adminClient = createAdminClient();
  
  // ✅ ใช้ Type ตรงจาก database.types.ts ได้ทันที ไม่ต้องใส่ as any
  const { error: updateError } = await adminClient
    .from('teams')
    .update({ 
      is_roster_locked: true,
      updated_at: new Date().toISOString() 
    })
    .eq('id', teamId);

  if (updateError) {
    throw new Error(`Failed to lock roster: ${updateError.message}`);
  }

  return { success: true };
}
