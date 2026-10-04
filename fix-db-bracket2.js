const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase.from('matches').update({
    status: 'READY'
  }).eq('bracket_node_id', 'b2bb7cb7-1fed-4e73-aca1-e08fcb6fa4d5');
  console.log('Set final match to READY');
}
run();
