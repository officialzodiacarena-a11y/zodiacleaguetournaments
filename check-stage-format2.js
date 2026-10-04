const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tournamentId = '41f8dd25-233e-44d2-9c70-e21db79070c5';
  const { data: stages } = await supabase.from('tournament_stages').select('id, name, format').eq('tournament_id', tournamentId);
  console.log('Stages:', JSON.stringify(stages, null, 2));
}
run();
