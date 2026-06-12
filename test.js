import fs from 'fs';
console.log(process.cwd());
console.log(fs.readdirSync('./public'));
try {
  console.log(fs.statSync('./public/duybeni.png').size);
} catch (e) {}
