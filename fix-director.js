const fs = require('fs');
let content = fs.readFileSync('app/admin/broadcast-director/page.tsx', 'utf8');

const regex = /{ id: 'CUSTOM_ICE', name: 'Custom View.*?},/;
content = content.replace(regex, "$& \n    { id: 'PODIUM', name: 'Tournament Podium (ผลการแข่งขัน)', color: 'bg-yellow-600' },");

fs.writeFileSync('app/admin/broadcast-director/page.tsx', content, 'utf8');
