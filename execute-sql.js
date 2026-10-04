const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = \
    CREATE TABLE IF NOT EXISTS public.broadcast_controls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        active_scene TEXT NOT NULL DEFAULT 'STANDBY',
        active_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE public.broadcast_controls ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.broadcast_controls;
    CREATE POLICY "Enable read access for all users" ON public.broadcast_controls FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Enable update for admins" ON public.broadcast_controls;
    CREATE POLICY "Enable update for admins" ON public.broadcast_controls FOR ALL USING (true);

    INSERT INTO public.broadcast_controls (active_scene) SELECT 'STANDBY' WHERE NOT EXISTS (SELECT 1 FROM public.broadcast_controls);

    -- Enable Realtime (Ignore error if already added)
    DO \\\$\\\$
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_controls;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
    \\\$\\\$;
  \;
  
  // Since we can't run raw SQL from standard supabase-js client directly without RPC,
  // let's try calling postgres via connection string if available, or just create a 
  // quick edge function? Wait, supabase-js does not support raw SQL unless via RPC.
  console.log('Cannot run raw SQL without RPC.');
}
run();
