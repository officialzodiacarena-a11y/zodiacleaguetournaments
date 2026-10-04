const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: match } = await supabase.from('matches').select('created_at').eq('id', '77c7ee11-33f9-4cc9-8474-17e9e812f5ea').single();
  console.log('Match created at:', match.created_at);
  
  const { data: countData } = await supabase.from('matches').select('id', { count: 'exact' });
  console.log('Total matches:', countData.length);
}
run();
