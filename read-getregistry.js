const fs = require('fs');
const content = fs.readFileSync('app/tournament/page.tsx', 'utf8');
const match = content.match(/async function getRegistryData\(\) \{[\s\S]*?return \{/);
console.log(match ? match[0] : 'not found');
