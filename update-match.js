const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const matchId = '77c7ee11-33f9-4cc9-8474-17e9e812f5ea';
  const pweId = 'b881ee53-666e-4c71-a4e2-4b005d6cda63';

  const { data, error } = await supabase
    .from('matches')
    .update({
      score_a: 0,
      score_b: 2,
      winner_team_id: pweId,
      status: 'COMPLETED',
      ended_at: new Date().toISOString()
    })
    .eq('id', matchId)
    .select();
  
  if (error) console.error(error);
  else console.log('Updated match 2:', data);
}
run();
