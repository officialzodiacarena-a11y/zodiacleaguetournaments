const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: matchCols } = await supabase.rpc('get_table_columns', { table_name: 'matches' });
  console.log('matches cols:', matchCols);
  
  const { data: series } = await supabase.from('match_series').select('*').eq('match_id', '77c7ee11-33f9-4cc9-8474-17e9e812f5ea');
  console.log('series:', series);
}
run();
