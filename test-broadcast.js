const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const channel = supabase.channel('broadcast-director');
channel.subscribe(async (status) => {
  console.log('Status:', status);
  if (status === 'SUBSCRIBED') {
    const res = await channel.send({
      type: 'broadcast',
      event: 'scene-change',
      payload: { scene: 'PODIUM', matchId: '' }
    });
    console.log('Send result:', res);
    process.exit(0);
  }
});
