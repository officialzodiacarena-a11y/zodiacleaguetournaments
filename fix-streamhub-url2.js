const fs = require('fs');

const path = 'app/stream-hub/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add a hook to read matchId from URL
content = content.replace(
  "useEffect(() => { setIsViewer(window.location.search.includes('viewer=true')); }, []);",
  "useEffect(() => { const params = new URLSearchParams(window.location.search); setIsViewer(params.get('viewer') === 'true'); const urlMatchId = params.get('matchId'); if (urlMatchId) { setCurrentMatchId(urlMatchId); } }, []);"
);

fs.writeFileSync(path, content, 'utf8');
