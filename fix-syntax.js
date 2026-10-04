const fs = require('fs');

function fixSyntaxError(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/teamB: toParticipant\(n\.team_b_id\),\r?\n\s*\}\)\);/g, "teamB: toParticipant(n.team_b_id),\n    }; });");
  fs.writeFileSync(path, content, 'utf8');
}

fixSyntaxError('app/tournament/[tournamentId]/bracket/page.tsx');
fixSyntaxError('app/admin/tournaments/[id]/bracket/page.tsx');
