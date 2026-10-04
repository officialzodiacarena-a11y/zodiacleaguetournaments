const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const teamId = 'b881ee53-666e-4c71-a4e2-4b005d6cda63'; // POWER UP E-SPORT
  
  const { data: members, error } = await supabase
    .from('team_members')
    .select('id, role, player_id, players!team_members_player_id_fkey(id, display_name, real_name, game_accounts!game_accounts_player_id_fkey(verification_status, game_id))')
    .eq('team_id', teamId)
    .eq('status', 'ACTIVE');
    
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS! count:', members.length);
  }
}
run();
