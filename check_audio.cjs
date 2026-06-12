const fs = require('fs');

const files = [
  'public/s01.mp3',
  'public/s02.mp3',
  'public/s03.mp3',
  'public/s04.mp3',
  'public/f01.mp3',
  'public/ruhsal.mp3'
];

files.forEach(f => {
  try {
    const stats = fs.statSync(f);
    console.log(`${f}: ${stats.size} bytes`);
  } catch(e) {
    console.error(`${f}: ${e.message}`);
  }
});
