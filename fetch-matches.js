const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Find Monarch vs Power Up match
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, team_a_id, team_b_id, status, teams:teams!matches_team_a_id_fkey(name)')
    .limit(10);
  
  console.log(matches);
}
run();
