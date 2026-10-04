const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('tournament_registrations').update({ status: 'APPROVED' }).in('status', ['ELIGIBLE', 'PENDING']).select('id, status');
  if (error) console.error(error);
  else console.log('Updated to APPROVED:', data.length);
}
run();
