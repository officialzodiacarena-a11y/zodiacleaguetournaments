const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's check the schema cache for tournament_registration_status enum if possible
  const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'tournament_registration_status' });
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}
run();
