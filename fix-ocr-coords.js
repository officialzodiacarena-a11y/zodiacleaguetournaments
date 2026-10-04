const fs = require('fs');
const path = 'lib/ocr/roi-regions.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const ROW_TOP = 0.51;',
  'const ROW_TOP = 0.72;' // Push down to bottom area
);
content = content.replace(
  'const ROW_HEIGHT = 0.085;',
  'const ROW_HEIGHT = 0.055;' // Standard HUD boxes are tightly packed
);
content = content.replace(
  'x: 0.043,',
  'x: 0.06,' 
);
content = content.replace(
  'x: 0.868,',
  'x: 0.85,' 
);

fs.writeFileSync(path, content, 'utf8');
