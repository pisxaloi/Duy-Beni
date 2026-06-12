const fs = require('fs');
let t = fs.readFileSync('src/App.tsx', 'utf-8');

// remove 'search' from currentView typing
t = t.replace(/'search' \| /g, '');

// add hasStarted state
t = t.replace("const [isAuthLoading, setIsAuthLoading] = useState(true);", "const [isAuthLoading, setIsAuthLoading] = useState(true);\n  const [hasStarted, setHasStarted] = useState(false);");

// modify speakSentence
const speakSentenceCode = `const speakSentence = async (index: number, activeScript: string[]) => {
    if (index >= activeScript.length) {
      if (currentView === 'intro') handleViewChange('sentence');
      else if (currentView === 'egypt') setIsPlaying(false);
      else setIsPlaying(false);
      return;
    }

    stopAudio();`;

t = t.replace(/const speakSentence = async \(index: number, activeScript: string\[\]\) => \{[\s\S]*?stopAudio\(\);/, speakSentenceCode);

// fix useEffect for auto speak
t = t.replace("if (currentView === 'search') speakSentence(0, searchScript);\n    else if (currentView === 'sentence') speakSentence(0, questionScript);", "if (currentView === 'sentence') speakSentence(0, questionScript);");

// fix App container onClick that starts intro
t = t.replace(`onClick={() => {
        if (currentView === 'intro' && !isPlaying) {
          speakSentence(0, introScript);
        }
      }}`, `onClick={() => {
        if (currentView === 'intro' && hasStarted && !isPlaying) {
          // allow skipping or retriggering if needed, but we rely on hasStarted button now
        }
      }}`);


// Fix the intro UI
const introSearchRegex = /\{currentView === 'intro' && \([\s\S]*?\}\)[\s\S]*?\{currentView === 'search' && \([\s\S]*?\}\)/;
const newIntroSearch = `{currentView === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col relative justify-center items-center h-full">
              {!hasStarted ? (
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    setHasStarted(true);
                    await initAudio();
                    speakSentence(0, introScript);
                  }}
                  className="px-6 py-3 border border-yellow-500/50 text-yellow-500 rounded-sm tracking-[0.3em] font-light z-50 animate-pulse hover:bg-yellow-500 hover:text-black transition-all uppercase text-sm"
                >
                  SİSTEMİ BAŞLAT
                </button>
              ) : (
                <div className="absolute inset-0 flex flex-col justify-end items-center pb-[130px] px-6 pointer-events-none z-[110]">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full text-white font-light text-sm tracking-wide leading-relaxed text-center drop-shadow-md"
                  >
                    {introScript[currentIndex]}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}`;

t = t.replace(introSearchRegex, newIntroSearch);

fs.writeFileSync('src/App.tsx', t);
