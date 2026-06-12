const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/text-\[13px\] tracking-\[([^\]]+)\]/g, 'text-[9px] tracking-[$1]');
content = content.replace(/text-\[13px\] font-extralight/g, 'text-[8px] font-extralight');
content = content.replace(/text-\[13px\] font-normal/g, 'text-[10px] font-normal');
content = content.replace(/text-\[13px\] text-yellow-500/g, 'text-[9px] text-yellow-500');
content = content.replace(/text-\[13px\] text-white/g, 'text-[10px] text-white');
content = content.replace(/text-\[13px\]/g, 'text-[10px]');

fs.writeFileSync(path, content, 'utf8');
console.log('Restored text sizes selectively!');
