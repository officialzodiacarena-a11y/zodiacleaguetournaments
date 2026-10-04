const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const channel = supabase.channel('broadcast-director');
channel.subscribe(async (status) => {
  console.log('Status:', status);
  if (status === 'SUBSCRIBED') {
    setInterval(async () => {
      const res = await channel.send({
        type: 'broadcast',
        event: 'scene-change',
        payload: { scene: 'PODIUM', matchId: '' }
      });
      console.log('Sent PODIUM:', new Date().toISOString(), res);
    }, 2000);
  }
});
