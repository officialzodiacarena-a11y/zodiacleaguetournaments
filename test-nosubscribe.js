const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const channel = supabase.channel('some-channel');
  // I DO NOT CALL SUBSCRIBE
  try {
    const res = await channel.send({
      type: 'broadcast',
      event: 'scene-change',
      payload: { scene: 'PODIUM' }
    });
    console.log('Send result without subscribe:', res);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
