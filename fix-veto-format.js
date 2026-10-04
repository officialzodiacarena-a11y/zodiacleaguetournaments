const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const stageId = '7516fa5f-a3a5-4063-96ce-ecdd11f3d43f';
  const format = {
    sequence: ['BAN', 'BAN', 'BAN', 'BAN', 'BAN', 'BAN', 'DECIDER'],
    team_a_first: true,
    time_limit_seconds: 60
  };
  await supabase.from('tournament_stages').update({ veto_format: format }).eq('id', stageId);
  console.log('Updated Veto Format for stage', stageId);
}
run();
