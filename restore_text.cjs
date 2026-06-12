const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /text-\[13px\]/g;
let match;
let matchArray = [];
while ((match = regex.exec(content)) !== null) {
  matchArray.push({ index: match.index, length: match[0].length });
}
console.log('text-[13px] count:', matchArray.length);

const originalSizes = [
  "text-xs", "text-[10px]", "text-[10px]", "text-[11px]", "text-[8px]", "text-[9px]", 
  "text-[10px]", "text-xs", "text-[10px]", "text-[11px]", "text-[12px]", "text-[10px]", 
  "text-[8px]", "text-[12px]", "text-[12px]", "text-[10px]", "text-[8px]", "text-[13px]", 
  "text-[11px]", "text-[10px]", "text-[8px]", "text-[11px]", "text-[7px]", "text-[11px]", 
  "text-[7px]", "text-[6px]", "text-[10px]", "text-[6px]", "text-[10px]", "text-[12px]", 
  "text-[11px]", "text-[10px]", "text-[9px]", "text-[9px]", "text-[12px]", "text-[13px]", 
  "text-[11px]", "text-[7px]", "text-[10px]", "text-[10px]", "text-[9px]", 
  "text-xs", "text-[9px]", "text-[13px]", "text-[11px]", "text-[6px]", "text-[10px]", 
  "text-[8px]", "text-[9px]", "text-[12px]", "text-[13px]", "text-[11px]", "text-[10px]", 
  "text-[10px]", "text-[8px]", "text-[12px]", "text-[10px]", "text-[13px]", 
  "text-[10px]", "text-[13px]", "text-[13px]", "text-[13px]", "text-[8px]", 
  "text-[10px]", "text-[10px]", "text-[11px]", "text-[8px]", "text-[8px]", "text-[9px]", 
  "text-[8px]", "text-[9px]", "text-[8px]", "text-[9px]", "text-[10px]", "text-[10px]", 
  "text-[10px]", "text-[10px]", "text-[9px]", "text-[9px]", "text-[9px]", 
  "text-[6px]", "text-[8px]", "text-[8px]"
];

// Let's not auto-replace, we don't know the exact order anymore because I edited some lines manually.
