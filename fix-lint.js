const fs = require('fs');
const file = 'app/spectator/control/[match_id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('catch (err: any) {', 'catch (err) {');
content = content.replace('err.message || ""', 'err instanceof Error ? err.message : String(err)');

fs.writeFileSync(file, content);
