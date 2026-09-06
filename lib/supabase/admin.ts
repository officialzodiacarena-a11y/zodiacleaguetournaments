import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. Server actions only, never import from client components.
// Needed because Block 1/2 RLS doesn't grant regular users UPDATE on `teams`
// (only teams_public_read exists), so privileged mutations like locking a roster
// have to go through here after the caller's permission is checked explicitly.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createSupabaseJsClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
