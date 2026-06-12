const fs = require('fs');

let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

let seenStopListening = false;
let seenStopListeningQ = false;
let out = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const stopListening = () => {')) {
    if (seenStopListening) {
      // skip 5 lines block
      i += 5;
      continue;
    }
    seenStopListening = true;
  }
  if (line.includes('const stopListeningQuestion = () => {')) {
    if (seenStopListeningQ) {
      // skip 5 lines block
      i += 5;
      continue;
    }
    seenStopListeningQ = true;
  }
  out.push(line);
}

fs.writeFileSync('src/App.tsx', out.join('\n'));
