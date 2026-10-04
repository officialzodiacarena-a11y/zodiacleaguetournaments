const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tourId = '41f8dd25-233e-44d2-9c70-e21db79070c5';
  const { data: tour } = await supabase.from('tournaments').select('id, name, status').eq('id', tourId);
  console.log('Target Tournament:', tour);

  const { data: matches } = await supabase.from('matches').select('id, status, score_a, score_b, winner_team_id, bracket_node_id').eq('tournament_id', tourId);
  console.log('Matches in this tournament:', matches);
}
run();
