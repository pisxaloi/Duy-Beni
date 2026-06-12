const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const inDir = path.join(__dirname, '..', 'public', 'cc_repaired');
const outDir = path.join(__dirname, '..', 'public', 'cc_final');
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(inDir).filter(f => f.endsWith('.mp3')).sort();
if (files.length === 0) {
  console.error('No files found in', inDir);
  process.exit(1);
}

async function encodeFile(file) {
  const inPath = path.join(inDir, file);
  const outPath = path.join(outDir, file);
  console.log('Encoding', file);
  return new Promise((resolve, reject) => {
    const args = ['-y', '-i', inPath, '-ar', '44100', '-ac', '2', '-b:a', '128k', outPath];
    const p = spawn(ffmpegPath, args, { stdio: 'inherit' });
    p.on('error', (err) => reject(err));
    p.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg exit code ' + code));
    });
  });
}

(async () => {
  for (const f of files) {
    try {
      await encodeFile(f);
      console.log('Done', f);
    } catch (e) {
      console.error('Failed', f, e.message);
    }
  }
  console.log('All done');
})();
