const fs = require('fs');

const files = fs.readdirSync('public').filter(f => f.endsWith('.mp3'));

for (const f of files) {
  const p = 'public/' + f;
  const buf = fs.readFileSync(p);
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    // ID3 tag found
    const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
    const totalSize = size + 10;
    console.log(`Stripping ${totalSize} bytes from ${f}`);
    const stripped = buf.slice(totalSize);
    fs.writeFileSync(p, stripped);
  }
}
console.log("Done");
