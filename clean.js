import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const usedImages = [
  '81.png', '82.png', '83.png', '84.png', '85.png', '86.png', '87.png', '88.png',
  'ik1.png', 'ik2.png', 'ik3.png', 'ik4.png',
  'ts.jpg', 'duybeni.png',
  '151.png', '152.png', '153.png', '154.png', '155.png', '156.png', '157.png', '158.png',
  'damga.png', 'ros.png',
  'daily_texts.json', 'osmani_texts.json', 'unas_texts.json'
];

fs.readdirSync(publicDir).forEach(file => {
  if (!usedImages.includes(file)) {
    console.log('Deleting', file);
    fs.unlinkSync(path.join(publicDir, file));
  }
});
