const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: matches } = await supabase.from('matches').select('id, team_a_id, team_b_id, status, score_a, score_b, winner_team_id').order('match_number');
  console.log('Matches:', matches);

  const { data: tour } = await supabase.from('tournaments').select('id, name, status').limit(1);
  console.log('Tournament:', tour);
}
run();
