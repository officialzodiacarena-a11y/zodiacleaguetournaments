const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: seasons } = await supabase.from('seasons').select('*').eq('circuit_id', '6f200fec-2b05-4ece-a655-0bbf4bfbb36b');
  console.log('Winter Seasons:', seasons);
}
run();
