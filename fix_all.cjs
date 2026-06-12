const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add unlock audio logic around hasStarted
if (!code.includes("const unlockAudio = async () =>")) {
  const unlockFn = `const unlockAudio = async () => {
    try {
      await initAudio();
      const silentAudio = new Audio("data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
      silentAudio.play().catch(() => {});
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance("");
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }
    } catch(e) {}
  };`;
  code = code.replace("const handleViewChange = async (view: typeof currentView) => {", unlockFn + "\n\n  const handleViewChange = async (view: typeof currentView) => {");
  code = code.replace("onClick={() => setHasStarted(true)}", "onClick={() => { unlockAudio(); setHasStarted(true); }}");
}

// 2. Fix SpeechSynthesis garbage collection & volume
code = code.replace(/currentUtteranceRef\.current = utterance;\s*utterance\.lang = "tr-TR";\s*utterance\.rate = (0\.[0-9]+);\s*utterance\.volume = ([^;]+);/g, 
  'currentUtteranceRef.current = utterance;\n        ;(window as any).ttsUtterances = (window as any).ttsUtterances || [];\n        (window as any).ttsUtterances.push(utterance);\n        utterance.lang = "tr-TR";\n        utterance.rate = $1;\n        utterance.volume = 1;');

code = code.replace(/const utterance = new SpeechSynthesisUtterance\(symbols\[currentIndex\]\.meaning\);\s*utterance\.lang = "tr-TR";\s*utterance\.rate = (0\.[0-9]+);\s*utterance\.volume = ([^;]+);/g, 
  'const utterance = new SpeechSynthesisUtterance(symbols[currentIndex].meaning);\n          ;(window as any).ttsUtterances = (window as any).ttsUtterances || [];\n          (window as any).ttsUtterances.push(utterance);\n          utterance.lang = "tr-TR";\n          utterance.rate = $1;\n          utterance.volume = 1;');

// Remove leading slashes from audio paths! The root cause of "no sound" in Capacitor is absolute paths.
code = code.replace(/new Audio\("\/(.*?\.mp3)"\)/g, 'new Audio("$1")');
code = code.replace(/fetch\("\/(.*?\.mp3)"\)/g, 'fetch("$1")');
code = code.replace(/audio:\s*"\/(.*?\.mp3)"/g, 'audio: "$1"');
code = code.replace(/audioFile\s*=\s*\n\s*activeEgDetail.*?\n\s*\? "\/nut\.mp3"/g, 'audioFile =\n          activeEgDetail === "nut"\n            ? "nut.mp3"');
code = code.replace(/\? "\/([^"]*\.mp3)"/g, '? "$1"');
code = code.replace(/: "\/([^"]*\.mp3)"/g, ': "$1"');
code = code.replace(/src="\/ambient/g, 'src="ambient');

// Local audio fixes
code = code.replace(/const fileName = `\/cc/g, 'const fileName = `cc');

fs.writeFileSync('src/App.tsx', code);
