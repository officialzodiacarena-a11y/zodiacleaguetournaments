const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const winterCircuitId = '6f200fec-2b05-4ece-a655-0bbf4bfbb36b';
  
  // Create a season for winter circuit
  const { data: season, error: err1 } = await supabase.from('seasons').insert({
    name: 'Winter Split 2026',
    circuit_id: winterCircuitId,
    status: 'ACTIVE',
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: '2026-12-31T00:00:00Z'
  }).select().single();
  
  if (err1) { console.error('Season Error:', err1); return; }
  console.log('Created Season:', season);

  const tourId = '41f8dd25-233e-44d2-9c70-e21db79070c5';
  const { data: tour, error: err2 } = await supabase.from('tournaments').update({
    season_id: season.id
  }).eq('id', tourId).select().single();

  if (err2) { console.error('Tour Error:', err2); return; }
  console.log('Updated Tournament:', tour);
}
run();
