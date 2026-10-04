const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: circuits } = await supabase.from('circuits').select('id, name');
  console.log('Circuits:', circuits);
  const { data: seasons } = await supabase.from('seasons').select('id, name, circuit_id, status');
  console.log('Seasons:', seasons);
}
run();
