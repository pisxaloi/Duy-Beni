const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// replace text-[6px] to text-[12px] with text-[13px]
content = content.replace(/text-\[([6-9]|1[0-2])px\]/g, 'text-[13px]');

// replace text-xs with text-[13px]
content = content.replace(/\btext-xs\b/g, 'text-[13px]');

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
