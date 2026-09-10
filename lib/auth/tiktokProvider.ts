import type { Provider } from '@supabase/supabase-js';

// Supabase Auth has no built-in "tiktok" provider — it must be registered as a
// Custom OAuth Provider in the Supabase Dashboard (Authentication > Sign In / Up >
// Auth Providers > Add custom OAuth provider) with the id below, using the Client
// ID/Secret from TikTok for Developers (Login Kit) and this project's
// /auth/callback as the redirect URI. That dashboard step can only be done by the
// team member with Supabase admin access — this constant just has to match the id
// they register there.
export const TIKTOK_PROVIDER = 'custom:tiktok' as Provider;
