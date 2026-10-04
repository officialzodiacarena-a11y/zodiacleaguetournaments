const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const matchId = '77c7ee11-33f9-4cc9-8474-17e9e812f5ea';
  const teamA = '6a2bc438-dbe5-4740-94e7-ab24d3520469'; // Monarch
  const teamB = 'b881ee53-666e-4c71-a4e2-4b005d6cda63'; // PWE

  const vetoes = [
    { match_id: matchId, step_order: 1, action: 'BAN', team_id: teamA, map_name: 'Haven', was_auto: false },
    { match_id: matchId, step_order: 2, action: 'BAN', team_id: teamB, map_name: 'Ascent', was_auto: false },
    { match_id: matchId, step_order: 3, action: 'PICK', team_id: teamA, map_name: 'Lotus', side_choice: 'ATTACKING', was_auto: false },
    { match_id: matchId, step_order: 4, action: 'SIDE_PICK', team_id: teamB, map_name: 'Lotus', side_choice: 'DEFENDING', was_auto: false },
    { match_id: matchId, step_order: 5, action: 'PICK', team_id: teamB, map_name: 'Sunset', side_choice: 'ATTACKING', was_auto: false },
    { match_id: matchId, step_order: 6, action: 'SIDE_PICK', team_id: teamA, map_name: 'Sunset', side_choice: 'DEFENDING', was_auto: false },
    { match_id: matchId, step_order: 7, action: 'BAN', team_id: teamA, map_name: 'Abyss', was_auto: false },
    { match_id: matchId, step_order: 8, action: 'DECIDER', team_id: null, map_name: 'Split', side_choice: null, was_auto: true },
    { match_id: matchId, step_order: 9, action: 'SIDE_PICK', team_id: teamB, map_name: 'Split', side_choice: 'DEFENDING', was_auto: false }
  ];

  // First delete any existing vetoes if they exist
  await supabase.from('map_vetoes').delete().eq('match_id', matchId);

  const { data, error } = await supabase.from('map_vetoes').insert(vetoes).select();
  
  if (error) console.error('Error inserting vetoes:', error);
  else console.log('Inserted vetoes successfully.');

  // Set match to LIVE and BO3
  await supabase.from('matches').update({ status: 'LIVE', best_of: 3 }).eq('id', matchId);
}
run();
