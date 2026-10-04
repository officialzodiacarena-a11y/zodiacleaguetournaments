const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const gameId = '17eac381-8baf-4bf8-a3d6-3c17904f7110';
  const playerId = '697e54d2-95d6-48c8-8e08-1c3dec6128a0'; // Puttipong Nijaroen
  const adminId = 'd2d8aac2-2a14-4d04-a591-ed1d487029fb';
  
  const { data, error } = await supabase
    .from('game_accounts')
    .insert({
      player_id: playerId,
      game_id: gameId,
      external_id: 'puttipong#1234',
      game_name: 'Puttipong',
      tag_line: '1234',
      region: 'ap',
      verification_status: 'VERIFIED',
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      reviewed_at: new Date().toISOString(),
      is_primary: true
    })
    .select();
    
  if (error) console.error(error);
  else console.log('Successfully created and verified account for Puttipong!');
}
run();
