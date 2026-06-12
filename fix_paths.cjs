const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
c = c.replace(/img: "15/g, 'img: "/15');
fs.writeFileSync('src/App.tsx', c);
