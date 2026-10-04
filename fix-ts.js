const fs = require('fs');
let content = fs.readFileSync('lib/bracket/advanceBracketFromMatch.ts', 'utf8');

content = content.replace("!matchData?.bracket_node_id", "!(matchData as unknown as { bracket_node_id: string | null })?.bracket_node_id");
content = content.replace("matchData.bracket_node_id", "(matchData as unknown as { bracket_node_id: string | null }).bracket_node_id");

fs.writeFileSync('lib/bracket/advanceBracketFromMatch.ts', content, 'utf8');
