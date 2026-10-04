const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const playerIds = [
    'd2d8aac2-2a14-4d04-a591-ed1d487029fb',
    'e2a5510b-ff9b-4ffe-8528-4714244cc75e',
    '060b188e-4b75-418c-ab4f-a0f70643bc47',
    '2357b369-1ac4-4446-9dcf-b25251f4a444',
    '108b769c-1184-4045-86bf-1c14768e6651',
    '697e54d2-95d6-48c8-8e08-1c3dec6128a0'
  ];
  
  const { data, error } = await supabase
    .from('game_accounts')
    .select('player_id, verification_status')
    .in('player_id', playerIds);
    
  console.log('Verified list:', data);
  const found = data.map(d => d.player_id);
  const missing = playerIds.filter(id => !found.includes(id));
  console.log('Missing player_ids:', missing);
}
run();
