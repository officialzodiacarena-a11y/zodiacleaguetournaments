const fs = require('fs');
let content = fs.readFileSync('lib/bracket/advanceBracketFromMatch.ts', 'utf8');

const regex = /<<<<<<< HEAD\r?\n.*?\r?\n=======\r?\n(.*?)\r?\n>>>>>>> 1d0e7a7.*?\r?\n/s;
content = content.replace(regex, "$1\n");

fs.writeFileSync('lib/bracket/advanceBracketFromMatch.ts', content, 'utf8');
