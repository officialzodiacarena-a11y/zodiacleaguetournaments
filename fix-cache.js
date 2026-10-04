const fs = require('fs');
const file = 'app/tournament/[tournamentId]/register/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('export const dynamic')) {
  content = content.replace("export default async function TournamentRegistrationPage", "export const dynamic = 'force-dynamic';\n\nexport default async function TournamentRegistrationPage");
  fs.writeFileSync(file, content);
}
