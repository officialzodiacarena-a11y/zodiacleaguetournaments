const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tournamentId = '41f8dd25-233e-44d2-9c70-e21db79070c5';
  
  // Find the stage for this tournament
  const { data: stages } = await supabase.from('tournament_stages').select('id').eq('tournament_id', tournamentId);
  if (!stages || stages.length === 0) return console.log('No stages');
  
  const stageIds = stages.map(s => s.id);
  const { data: matches } = await supabase.from('matches').select('id, match_number, status, team_a_id, team_b_id, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name)').in('stage_id', stageIds);
  
  console.log('Matches:', JSON.stringify(matches, null, 2));
}
run();
