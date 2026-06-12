const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/size=\{11\}\s*className=\{\s*currentView === item\.view\s*\?\s*"text-yellow-500"\s*:\s*"text-white\/40 group-hover:text-yellow-500"\s*\}/g, 'size={20} className={currentView === item.view && (!item.id || item.id === activeEgDetail) ? "text-yellow-500 transition-colors" : "text-white/40 group-hover:text-yellow-500 transition-colors"}');

fs.writeFileSync('src/App.tsx', c);
