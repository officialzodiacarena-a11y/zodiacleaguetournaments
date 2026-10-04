const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: nodes, error } = await supabase
    .from('bracket_nodes')
    .select('id, matches(id, score_a, score_b, winner_team_id, status)')
    .eq('id', '4dc41a1c-39bc-4ea0-ae17-1bd6464c89b7')
    .single();
  
  if (error) console.error(error);
  else console.log(JSON.stringify(nodes, null, 2));
}
run();
