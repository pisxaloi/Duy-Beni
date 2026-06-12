import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the onError handler block
const regex = /onError=\{\(e\) => \{[\s\S]*?\}\}/g;
code = code.replace(regex, '');

// Also change the key of the div inside navItems.map
code = code.replace(/key=\{item\.id\}/g, 'key={item.id + "-v2"}');

fs.writeFileSync('src/App.tsx', code);
