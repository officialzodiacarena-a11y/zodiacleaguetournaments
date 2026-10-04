const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('team_members')
    .update({ status: 'ACTIVE' })
    .eq('status', 'INVITED')
    .select('id, team_id');
  
  if (error) console.error('Error:', error);
  else console.log('Updated rows:', data.length, data);
}
run();
