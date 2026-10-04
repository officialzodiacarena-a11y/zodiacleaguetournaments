const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, player_id, players!team_members_player_id_fkey(id, display_name)')
    .eq('team_id', 'b881ee53-666e-4c71-a4e2-4b005d6cda63');
  
  if (error) console.error(error);
  else console.dir(data, { depth: null });
}
run();
