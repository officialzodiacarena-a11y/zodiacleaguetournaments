const fs = require('fs');
let content = fs.readFileSync('lib/bracket/advanceBracketFromMatch.ts', 'utf8');

const regex = /const \{\s*data:\s*bracketNodeRaw.*?\.maybeSingle\(\);/s;

const replaceCode = "const { data: matchData, error: matchDataErr } = await admin.from('matches' as never).select('bracket_node_id').eq('id', matchId).single();\n  if (matchDataErr) return { ok: false, error: matchDataErr.message };\n  if (!matchData?.bracket_node_id) return { ok: true, advanced: false };\n\n  const { data: bracketNodeRaw, error: nodeErr } = await admin.from('bracket_nodes' as never).select('id, winner_to_node_id, loser_to_node_id, bracket_type').eq('id', matchData.bracket_node_id).maybeSingle();";

content = content.replace(regex, replaceCode);
fs.writeFileSync('lib/bracket/advanceBracketFromMatch.ts', content, 'utf8');
console.log('Fixed advanceBracketFromMatch.ts');
