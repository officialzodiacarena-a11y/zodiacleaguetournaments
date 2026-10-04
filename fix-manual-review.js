const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const gameId = '17eac381-8baf-4bf8-a3d6-3c17904f7110';
  const adminId = 'd2d8aac2-2a14-4d04-a591-ed1d487029fb';
  
  const { data: updateData, error: updateError } = await supabase
    .from('game_accounts')
    .update({ 
      verification_status: 'VERIFIED',
      game_id: gameId,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      reviewed_at: new Date().toISOString()
    })
    .eq('verification_status', 'MANUAL_REVIEW')
    .select();
    
  console.log('Updated existing:', updateData?.length);
  if (updateError) console.error(updateError);
}
run();
