const fs = require('fs');

function fixBracketPage(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(
    /select\('id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, status, best_of'\)/g,
    "select('id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, status, best_of, matches(id, score_a, score_b, winner_team_id, status)')"
  );
  
  content = content.replace(
    /select\('id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, status, is_bye, best_of'\)/g,
    "select('id, bracket_type, round_number, position_in_round, label, team_a_id, team_b_id, status, is_bye, best_of, matches(id, score_a, score_b, winner_team_id, status)')"
  );

  const searchMap = "matches = (nodes ?? []).map((n, idx) => ({";
  const replaceMap = "matches = (nodes ?? []).map((n, idx) => { const m = n.matches && n.matches.length > 0 ? n.matches[0] : null; return { scoreA: m?.score_a ?? undefined, scoreB: m?.score_b ?? undefined, winnerTeamId: m?.winner_team_id ?? undefined,";
  
  content = content.replace(searchMap, replaceMap);
  content = content.replace("status: n.status as BracketMatchNode['status'],", "status: (m?.status ?? n.status) as BracketMatchNode['status'],");
  content = content.replace(/teamA: toParticipant\(n\.team_a_id\),\s*teamB: toParticipant\(n\.team_b_id\)\s*}\)\);/g, "teamA: toParticipant(n.team_a_id), teamB: toParticipant(n.team_b_id) }; });");
  
  fs.writeFileSync(path, content, 'utf8');
  console.log('Fixed', path);
}

fixBracketPage('app/tournament/[tournamentId]/bracket/page.tsx');
fixBracketPage('app/admin/tournaments/[id]/bracket/page.tsx');
