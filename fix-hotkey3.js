const fs = require('fs');
const path = 'app/overlay/match/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /\} else if \(e\.altKey && \(e\.key === "x" \|\| e\.key === "X" \|\| e\.code === "KeyX"\)\) \{\s*e\.preventDefault\(\);\s*setShowBuyPhase\(\(prev\) => !prev\);\s*\}/g,
  '} else if (e.altKey && (e.key === "x" || e.key === "X" || e.code === "KeyX")) { e.preventDefault(); setShowRosterSidebar((prev) => !prev); }'
);

fs.writeFileSync(path, content, 'utf8');
