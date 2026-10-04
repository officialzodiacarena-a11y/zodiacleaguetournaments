const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tourId = '41f8dd25-233e-44d2-9c70-e21db79070c5';
  const { data: tour } = await supabase.from('tournaments').select('season_id').eq('id', tourId).single();
  console.log('Tournament season_id:', tour.season_id);

  if (tour.season_id) {
    const { data: season } = await supabase.from('seasons').select('circuit_id, name, status').eq('id', tour.season_id).single();
    console.log('Tournament Season:', season);
    
    if (season.circuit_id) {
       const { data: circuit } = await supabase.from('circuits').select('name').eq('id', season.circuit_id).single();
       console.log('Circuit:', circuit.name);
    }
  }
}
run();
