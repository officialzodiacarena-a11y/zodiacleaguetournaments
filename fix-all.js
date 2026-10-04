const fs = require('fs');

// 1. Fix types/tournament.ts
let typesContent = fs.readFileSync('types/tournament.ts', 'utf8');
if (!typesContent.includes('isRegistrationClosed')) {
  typesContent = typesContent.replace('registrationClosesAt?: string | null;', "registrationClosesAt?: string | null;\n  isRegistrationClosed?: boolean;");
  fs.writeFileSync('types/tournament.ts', typesContent, 'utf8');
}

// 2. Fix app/tournament/page.tsx
let pageContent = fs.readFileSync('app/tournament/page.tsx', 'utf8');
if (!pageContent.includes('isRegistrationClosed:')) {
  pageContent = pageContent.replace("maxTeams,", "maxTeams,\n        isRegistrationClosed: t.registration_closes_at ? new Date(t.registration_closes_at).getTime() < Date.now() : false,");
  const oldBtn = ") : (";
  const newBtn = `) : tour.isRegistrationClosed ? (
                  <Link
                    href={\`/tournament/\${tour.id}/bracket\`}
                    className="block w-full text-center rounded-lg border border-[#E8B429] bg-[#E8B429]/10 py-2.5 text-xs font-bold tracking-wider text-[#E8B429] hover:bg-[#E8B429]/20 transition-all"
                  >
                    ดูสายการแข่ง / VIEW BRACKET
                  </Link>
                ) : (`
  pageContent = pageContent.replace(oldBtn, newBtn);
  fs.writeFileSync('app/tournament/page.tsx', pageContent, 'utf8');
}
