const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const matchId = '77c7ee11-33f9-4cc9-8474-17e9e812f5ea';
  const { data: games } = await supabase.from('match_games').select('*').eq('match_id', matchId);
  console.log('Games schema/data:', JSON.stringify(games, null, 2));
}
run();
