const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('game_accounts').select('*').in('player_id', [
    'd2d8aac2-2a14-4d04-a591-ed1d487029fb', // Si Ri
    'e2a5510b-ff9b-4ffe-8528-4714244cc75e', // NIGHTNINE
    '060b188e-4b75-418c-ab4f-a0f70643bc47', // JukJik
  ]);
  console.log(data);
}
run();
