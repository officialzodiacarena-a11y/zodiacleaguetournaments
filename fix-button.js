const fs = require('fs');
let content = fs.readFileSync('app/tournament/page.tsx', 'utf8');

content = content.replace("maxTeams,", "maxTeams,\n        isRegistrationClosed: t.registration_closes_at ? new Date(t.registration_closes_at).getTime() < Date.now() : false,");

const oldStr = ") : (";
const newStr = `) : tour.isRegistrationClosed || tour.status === 'ONGOING' || tour.status === 'ACTIVE' ? (
                  <Link
                    href={\`/tournament/\${tour.id}/bracket\`}
                    className="block w-full text-center rounded-lg border border-[#E8B429] bg-[#E8B429]/10 py-2.5 text-xs font-bold tracking-wider text-[#E8B429] hover:bg-[#E8B429]/20 transition-all"
                  >
                    ดูสายการแข่ง / VIEW BRACKET
                  </Link>
                ) : (`
content = content.replace(oldStr, newStr);

fs.writeFileSync('app/tournament/page.tsx', content, 'utf8');
