const fs = require('fs');
const path = 'app/overlay/match/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add a state for hiding roster sidebar
if (!content.includes('showRosterSidebar')) {
  content = content.replace(
    'const [showBuyPhase, setShowBuyPhase] = useState<boolean>(false);',
    'const [showBuyPhase, setShowBuyPhase] = useState<boolean>(false);\n  const [showRosterSidebar, setShowRosterSidebar] = useState<boolean>(false);' // default to FALSE in emergency
  );

  // Update hotkey
  content = content.replace(
    'if (e.altKey && (e.key === "c" || e.key === "C" || e.code === "KeyC")) {',
    'if (e.altKey && (e.key === "c" || e.key === "C" || e.code === "KeyC")) { e.preventDefault(); setShowBuyPhase((prev) => !prev); } else if (e.altKey && (e.key === "x" || e.key === "X" || e.code === "KeyX")) {'
  );
  content = content.replace(
    'setShowBuyPhase((prev) => !prev);\n        }',
    'setShowRosterSidebar((prev) => !prev);\n        }'
  );

  // Update rendering
  content = content.replace(
    '{showScoreboard && !showBuyPhase && <LiveRosterSidebar roster={rosterA} side="left" team="A" />}',
    '{showScoreboard && !showBuyPhase && showRosterSidebar && <LiveRosterSidebar roster={rosterA} side="left" team="A" />}'
  );
  content = content.replace(
    '{showScoreboard && !showBuyPhase && <LiveRosterSidebar roster={rosterB} side="right" team="B" />}',
    '{showScoreboard && !showBuyPhase && showRosterSidebar && <LiveRosterSidebar roster={rosterB} side="right" team="B" />}'
  );

  fs.writeFileSync(path, content, 'utf8');
}
