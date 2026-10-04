const fs = require('fs');
let content = fs.readFileSync('lib/bracket/advanceBracketFromMatch.ts', 'utf8');

const regex = /winner_team_id:\s*winnerTeamId,/;
content = content.replace(regex, "");
fs.writeFileSync('lib/bracket/advanceBracketFromMatch.ts', content, 'utf8');
console.log('Fixed winner_team_id bug');
