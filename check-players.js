const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const matchId = '77c7ee11-33f9-4cc9-8474-17e9e812f5ea';
  const { data: teamA } = await supabase.from('team_members').select('players(display_name, game_name)').eq('team_id', '6a2bc438-dbe5-4740-94e7-ab24d3520469');
  const { data: teamB } = await supabase.from('team_members').select('players(display_name, game_name)').eq('team_id', 'b881ee53-666e-4c71-a4e2-4b005d6cda63');
  
  console.log('Monarch:', JSON.stringify(teamA));
  console.log('Power Up:', JSON.stringify(teamB));
}
run();
