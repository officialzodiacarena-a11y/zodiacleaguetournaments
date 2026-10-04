const { createBrowserClient } = require('@supabase/ssr');
const c1 = createBrowserClient('https://a.co', 'key');
const c2 = createBrowserClient('https://a.co', 'key');
console.log('Same instance?', c1 === c2);
