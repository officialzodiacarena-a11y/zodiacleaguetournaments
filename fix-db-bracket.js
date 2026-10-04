const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // node 1: ICEBERG vs TBD
  const n1 = '990c5587-51a9-410d-beeb-09dfad98cba1';
  // node 2: MR vs PWE
  const n2 = '4dc41a1c-39bc-4ea0-ae17-1bd6464c89b7';
  // next node: Final
  const nextNode = 'b2bb7cb7-1fed-4e73-aca1-e08fcb6fa4d5';
  
  const team1 = '826ae2d5-a130-4092-84a4-82183035e8c3'; // ICEBERG
  const team2 = 'b881ee53-666e-4c71-a4e2-4b005d6cda63'; // PWE

  // Update next node
  await supabase.from('bracket_nodes').update({
    team_a_id: team1,
    team_b_id: team2,
    status: 'READY'
  }).eq('id', nextNode);

  // Mark n2 as completed
  await supabase.from('bracket_nodes').update({
    status: 'COMPLETED'
  }).eq('id', n2);
  
  console.log('Fixed bracket advancement in DB');
  
  // Oh, wait, the matches table needs to be created for the Grand Final if it doesn't exist?
  // Let's check if the matches table has a row for nextNode!
  const { data: existingMatch } = await supabase.from('matches').select('*').eq('bracket_node_id', nextNode).single();
  if (!existingMatch) {
    const { data: tour } = await supabase.from('bracket_nodes').select('stage_id, tournament_stages(tournament_id)').eq('id', nextNode).single();
    
    await supabase.from('matches').insert({
      tournament_id: '41f8dd25-233e-44d2-9c70-e21db79070c5',
      bracket_node_id: nextNode,
      team_a_id: team1,
      team_b_id: team2,
      status: 'AWAITING_RESULT',
      best_of: 3,
      stage_id: tour.stage_id
    });
    console.log('Created match for Grand Final');
  } else {
    await supabase.from('matches').update({
      team_a_id: team1,
      team_b_id: team2,
      status: 'AWAITING_RESULT'
    }).eq('bracket_node_id', nextNode);
    console.log('Updated existing match for Grand Final');
  }
}
run();
