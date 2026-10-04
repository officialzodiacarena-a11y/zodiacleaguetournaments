const fs = require('fs');
let content = fs.readFileSync('lib/bracket/advanceBracketFromMatch.ts', 'utf8');

const regex = /<<<<<<< HEAD.*?=======\r?\n(.*?)\r?\n>>>>>>> 1d0e7a7.*/s;
content = content.replace(regex, "$1");

fs.writeFileSync('lib/bracket/advanceBracketFromMatch.ts', content, 'utf8');
