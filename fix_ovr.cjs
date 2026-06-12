const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/backdrop-blur-sm overflow-hidden rounded-sm/g, 'backdrop-blur-sm overflow-visible rounded-sm');

// Also make the background div and images have border-radius just in case
c = c.replace(/className=\{`w-full h-full object-cover/g, 'className={`w-full h-full object-cover rounded-sm');

fs.writeFileSync('src/App.tsx', c);
