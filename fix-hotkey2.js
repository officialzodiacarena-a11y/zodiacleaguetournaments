const fs = require('fs');
const path = 'app/overlay/match/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// replace the second instance of setShowBuyPhase inside the keydown listener
content = content.replace(
  /} else if \(e.altKey && \(e.key === "x" \|\| e.key === "X" \|\| e.code === "KeyX"\)\) \{\s*e.preventDefault\(\);\s*setShowBuyPhase\(\(prev\) => !prev\);\s*}/g,
  } else if (e.altKey && (e.key === "x" || e.key === "X" || e.code === "KeyX")) { e.preventDefault(); setShowRosterSidebar((prev) => !prev); }
);

fs.writeFileSync(path, content, 'utf8');
