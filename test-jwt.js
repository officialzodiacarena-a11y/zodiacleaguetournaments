const fs = require('fs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const jwtSecret = env.match(/SUPABASE_JWT_SECRET=(.*)/)[1].trim();

const userId = 'cfc6a0ae-b868-4a26-bd65-5a9b73210a2d'; // Si Ri's user_id
const payload = {
  aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 60 * 60,
  sub: userId,
  role: 'authenticated'
};
const token = jwt.sign(payload, jwtSecret);

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { headers: { Authorization: Bearer  } }
});

async function run() {
  const { data: team } = await supabase.from('teams').select('id, name, captain_id').eq('captain_id', 'd2d8aac2-2a14-4d04-a591-ed1d487029fb').maybeSingle();
  console.log('Team:', team);
  
  if (team) {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('id, role, player_id, players(id, display_name, real_name, game_accounts(verification_status, game_id))')
      .eq('team_id', team.id)
      .eq('status', 'ACTIVE');
      
    if (error) console.error(error);
    else console.dir(members, { depth: null });
  }
}
run();
