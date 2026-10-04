const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // We can't impersonate easily without a JWT, but let's check policies on players
  const { data, error } = await supabase.from('players').select('id, display_name').eq('id', 'e2a5510b-ff9b-4ffe-8528-4714244cc75e');
  console.log('Using Service Role, player fetch:', data);
}
run();
