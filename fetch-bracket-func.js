const fs = require('fs');
const content = fs.readFileSync('app/tournament/[tournamentId]/bracket/page.tsx', 'utf8');
const match = content.match(/async function getBracketData[\s\S]*?return \{/);
console.log(match ? match[0] : 'not found');
