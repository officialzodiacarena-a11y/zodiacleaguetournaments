const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('players')
    .select('id, athlete_id, display_name, real_name, slug')
    .or('real_name.ilike.%PUTTIPONG%,display_name.ilike.%PUTTIPONG%,real_name.ilike.%NIJAROEN%');
  
  if (error) console.error('Error:', error);
  else console.log('Players found:', data);
}
run();
