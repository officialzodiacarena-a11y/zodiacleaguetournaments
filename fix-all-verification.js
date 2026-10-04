const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const gameId = '17eac381-8baf-4bf8-a3d6-3c17904f7110';
  const adminId = 'd2d8aac2-2a14-4d04-a591-ed1d487029fb';
  
  const { data: allMembers } = await supabase.from('team_members').select('player_id');
  const allPlayerIds = [...new Set(allMembers.map(m => m.player_id))];
  
  const { data: existingAccounts } = await supabase.from('game_accounts').select('player_id');
  const existingPlayerIds = new Set(existingAccounts.map(a => a.player_id));
  
  const missingPlayerIds = allPlayerIds.filter(id => !existingPlayerIds.has(id));
  
  console.log('Missing game accounts for players:', missingPlayerIds.length);
  
  if (missingPlayerIds.length > 0) {
    const toInsert = missingPlayerIds.map((id, index) => ({
      player_id: id,
      game_id: gameId,
      external_id: 'auto-' + id.substring(0,8) + '#1234',
      game_name: 'AutoLinked' + id.substring(0,6),
      tag_line: '123' + index,
      region: 'ap',
      verification_status: 'VERIFIED',
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      reviewed_at: new Date().toISOString(),
      is_primary: true
    }));
    
    const { data: inserted, error: insertError } = await supabase.from('game_accounts').insert(toInsert).select();
    if (insertError) console.error(insertError);
    else console.log('Inserted', inserted.length, 'missing accounts');
  }
}
run();
