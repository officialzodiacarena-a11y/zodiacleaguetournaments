const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: nodes } = await supabase.from('bracket_nodes').select('id, match_id').eq('tournament_id', '41f8dd25-233e-44d2-9c70-e21db79070c5');
  console.log('Nodes:', nodes);
}
run();
