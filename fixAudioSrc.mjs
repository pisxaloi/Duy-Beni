import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/audio\.src = "([\w\-]+\.(png|jpg|mp3))"/g, 'audio.src = "/$1"');

fs.writeFileSync('src/App.tsx', code);
