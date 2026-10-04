const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const matchId = '77c7ee11-33f9-4cc9-8474-17e9e812f5ea';
  const { data: match } = await supabase.from('matches').select('team_a_id, team_b_id, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name)').eq('id', matchId).single();
  console.log('Match Teams:', JSON.stringify(match, null, 2));
}
run();
