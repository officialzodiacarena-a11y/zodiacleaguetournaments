const fs = require('fs');
const path = 'app/overlay/match/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'e.preventDefault();\\n        setShowBuyPhase((prev) => !prev);\\n      }\\n    };',
  'e.preventDefault();\\n        setShowRosterSidebar((prev) => !prev);\\n      }\\n    };'
);

fs.writeFileSync(path, content, 'utf8');
