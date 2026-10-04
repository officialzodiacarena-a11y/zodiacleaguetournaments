const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, team_id, status, role, teams(name)');
    
  if (error) {
    console.error(error);
  } else {
    const counts = {};
    data.forEach(m => {
      const tName = m.teams?.name || 'Unknown';
      if (!counts[tName]) counts[tName] = { ACTIVE: 0, INVITED: 0, TOTAL: 0 };
      counts[tName][m.status] = (counts[tName][m.status] || 0) + 1;
      counts[tName].TOTAL += 1;
    });
    console.log(counts);
  }
}
run();
