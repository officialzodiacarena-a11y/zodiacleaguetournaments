const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const teamId = 'b881ee53-666e-4c71-a4e2-4b005d6cda63';
  const { data: members, error } = await supabase
    .from('team_members')
    .select('id, role, player_id, players(id, display_name, real_name, game_accounts(verification_status, game_id))')
    .eq('team_id', teamId)
    .eq('status', 'ACTIVE');
    
  if (error) console.error(error);
  else console.dir(members, { depth: null });
}
run();
