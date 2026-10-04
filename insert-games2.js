const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const matchId = '77c7ee11-33f9-4cc9-8474-17e9e812f5ea';
  const { data, error } = await supabase.from('match_games').insert([
    { match_id: matchId, game_number: 1, map_name: 'Lotus', status: 'IN_PROGRESS' },
    { match_id: matchId, game_number: 2, map_name: 'Sunset', status: 'SCHEDULED' },
    { match_id: matchId, game_number: 3, map_name: 'Split', status: 'SCHEDULED' }
  ]).select();
  
  if (error) console.error('Error:', error);
  else console.log('Inserted:', JSON.stringify(data, null, 2));
}
run();
