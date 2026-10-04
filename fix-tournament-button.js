const fs = require('fs');
let content = fs.readFileSync('app/tournament/page.tsx', 'utf8');

// 1. Add isRegistrationClosed to TournamentItem interface (actually it doesn't exist explicitly, I will just add it to the return object of sortedRows.map)
content = content.replace("maxTeams,", "maxTeams,\n        isRegistrationClosed: t.registration_closes_at ? new Date(t.registration_closes_at).getTime() < Date.now() : false,");

// 2. Modify the button render logic
const newButtonLogic = 
                ) : tour.isRegistrationClosed || tour.status === 'ONGOING' ? (
                  <Link
                    href={\/tournament/\/bracket\}
                    className="block w-full text-center rounded-lg border border-[#E8B429] bg-[#E8B429]/10 py-2.5 text-xs font-bold tracking-wider text-[#E8B429] hover:bg-[#E8B429]/20 transition-all"
                  >
                    ดูสายการแข่ง / VIEW BRACKET
                  </Link>
                ) : (
;
content = content.replace(") : (", newButtonLogic);

fs.writeFileSync('app/tournament/page.tsx', content);
