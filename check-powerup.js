const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: teams, error: teamError } = await supabase
    .from('teams')
    .select('id, name')
    .ilike('name', '%POWER UP%');
    
  if (teamError) {
    console.error('Error fetching team:', teamError);
    return;
  }
  
  if (teams.length > 0) {
    const team = teams[0];
    console.log('Team:', team);
    
    const { data: members, error: memError } = await supabase
      .from('team_members')
      .select('id, role, status')
      .eq('team_id', team.id);
      
    if (memError) {
      console.error('Error members:', memError);
    } else {
      console.log('Members:', members);
    }
  } else {
    console.log('Team not found');
  }
}
run();
