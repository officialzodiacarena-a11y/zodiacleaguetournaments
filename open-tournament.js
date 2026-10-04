const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tournamentId = '41f8dd25-233e-44d2-9c70-e21db79070c5';
  
  const newDate = new Date();
  newDate.setHours(newDate.getHours() + 2); // extend by 2 hours
  
  const { data, error } = await supabase
    .from('tournaments')
    .update({ 
      registration_closes_at: newDate.toISOString(),
      status: 'OPEN'
    })
    .eq('id', tournamentId)
    .select('id, name, registration_closes_at, status');
    
  if (error) console.error(error);
  else console.log('Successfully opened tournament:', data);
}
run();
