import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Re-add voiceAudioRef
if (!code.includes('const voiceAudioRef')) {
  code = code.replace(
    /const f01AudioRef = useRef<HTMLAudioElement \| null>\(null\);/,
    'const f01AudioRef = useRef<HTMLAudioElement | null>(null);\n  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);'
  );
}

// 2. Rewrite unlockAudio
const unlockAudioRegex = /const unlockAudio = async \(\) => \{[\s\S]*?(?:if \(typeof window !== "undefined" && window\.speechSynthesis\) \{[\s\S]*?\}|window\.speechSynthesis\.speak\(utterance\);[\s\S]*?\})\s*\};/;
const newUnlockAudio = `const unlockAudio = async () => {
    try {
      await initAudio();
      if (!voiceAudioRef.current) {
        voiceAudioRef.current = new Audio();
      }
      const audio = voiceAudioRef.current;
      audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
      await audio.play().catch(() => {});
      
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance("");
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error(error);
    }
  };`;
code = code.replace(unlockAudioRegex, newUnlockAudio);

// 3. Fix simple local audios (ruhsal.mp3, misir.mp3, unas1.mp3)
code = code.replace(/const audio = new Audio\("ruhsal\.mp3"\);/g, `let audio = voiceAudioRef.current; if(!audio){audio = new Audio("ruhsal.mp3"); voiceAudioRef.current = audio;} else { audio.src = "ruhsal.mp3"; }`);

code = code.replace(/const audio = new Audio\("misir\.mp3"\);/g, `let audio = voiceAudioRef.current; if(!audio){audio = new Audio("misir.mp3"); voiceAudioRef.current = audio;} else { audio.src = "misir.mp3"; }`);

code = code.replace(/const audio = new Audio\("unas1\.mp3"\);/g, `let audio = voiceAudioRef.current; if(!audio){audio = new Audio("unas1.mp3"); voiceAudioRef.current = audio;} else { audio.src = "unas1.mp3"; }`);

// 4. Fix detail audio
code = code.replace(/const audio = new Audio\(audioFile\);/g, `let audio = voiceAudioRef.current; if(!audio){audio = new Audio(audioFile); voiceAudioRef.current = audio;} else { audio.src = audioFile; }`);

fs.writeFileSync('src/App.tsx', code);
