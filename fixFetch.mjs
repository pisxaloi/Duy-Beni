import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/fetch\("([\w\-]+\.(json|mp3))"\)/g, 'fetch("/$1")');
code = code.replace(/fileName = \`([\w]+)\$\{String/g, 'fileName = `/$1${String');

fs.writeFileSync('src/App.tsx', code);
