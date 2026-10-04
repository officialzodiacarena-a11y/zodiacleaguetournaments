const fs = require('fs');
const path = 'lib/ocr/ocr-worker-pool.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("createWorker('eng')", "createWorker('eng+tha')");
fs.writeFileSync(path, content, 'utf8');
