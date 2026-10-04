const fs = require('fs');
const path = 'components/overlay/LiveRosterSidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Change left-6 to left-[100px] and right-6 to right-[100px]
content = content.replace(/left-6/g, 'left-[100px]');
content = content.replace(/right-6/g, 'right-[100px]');

fs.writeFileSync(path, content, 'utf8');
