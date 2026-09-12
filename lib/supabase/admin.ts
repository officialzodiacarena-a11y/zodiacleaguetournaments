import { createClient as createSupabaseJsClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// ============================================================================
// 🛑 STRICT SECURITY & PRIVILEGED SCOPE:
// Service-Role Admin Client — Bypasses Row Level Security (RLS).
// This module MUST ONLY be imported in Server Actions, Route Handlers, or
// background Workers. NEVER import or expose this to Client Components ("use client").
// ============================================================================

let adminClientInstance: SupabaseClient<Database> | null = null;

/**
 * Creates or retrieves a singleton Supabase Admin Client instance with service-role privileges.
 * 
 * Used for privileged backend operations (e.g., Roster Lock transitions,
 * Direct Treasury Fee Burns, and tables where regular users only possess SELECT policies).
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[CRITICAL] Missing Supabase Admin Environment Variables: Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured in .env.local'
    );
  }

  // Singleton instance to prevent redundant client initializations on server-side
  if (!adminClientInstance) {
    adminClientInstance = createSupabaseJsClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClientInstance;
}

// Export singleton direct instance as a convenient alias
export const supabaseAdmin = createAdminClient();
