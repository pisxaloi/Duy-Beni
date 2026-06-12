import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/\? "([\w\_]+\.mp3)"/g, '? "/$1"');
code = code.replace(/: "([\w\_]+\.mp3)"/g, ': "/$1"');

fs.writeFileSync('src/App.tsx', code);
