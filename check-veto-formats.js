const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: stages } = await supabase.from('tournament_stages').select('veto_format');
  const valid = stages.filter(s => s.veto_format && Object.keys(s.veto_format).length > 0);
  console.log('Sample Veto Formats:', JSON.stringify(valid.slice(0, 2), null, 2));
}
run();
