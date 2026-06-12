const fs = require('fs');

let t = fs.readFileSync('src/App.tsx', 'utf-8');

t = t.replace(
  'className="flex-1 flex flex-col relative justify-start items-center p-4 pt-4 text-center overflow-y-auto h-full w-full"',
  'className="flex-1 flex flex-col relative justify-start items-center p-4 pt-4 text-center overflow-y-auto scrollbar-hide h-full w-full"'
);

fs.writeFileSync('src/App.tsx', t);
