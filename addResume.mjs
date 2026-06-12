import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const unlockAudio = async \(\) => \{\s*try \{\s*await initAudio\(\);/;
const replacement = `const unlockAudio = async () => {
    try {
      await initAudio();
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/App.tsx', code);
