const fs = require('fs');
let t = fs.readFileSync('src/App.tsx', 'utf-8');

// add 'name_input' to currentView
t = t.replace(/'intro' \| 'sentence'/, "'intro' | 'name_input' | 'sentence'");

// add name state
t = t.replace(/const \[user, setUser\] = useState<FirebaseUser \| null>\(null\);/g, "const [user, setUser] = useState<FirebaseUser | null>(null);\n  const [localName, setLocalName] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('user_name') || '' : '');");


// Update speakSentence transition from intro
t = t.replace(/if \(currentView === 'intro'\) handleViewChange\('sentence'\);/g, "if (currentView === 'intro') handleViewChange('name_input');");

// Name Input view JSX
const nameInputView = `{currentView === 'name_input' && (
            <motion.div key="name_input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col relative justify-center items-center h-full px-6 text-center">
              <h2 className="text-xl font-light tracking-[0.2em] text-white mb-8">Senin adın ne?</h2>
              <input 
                type="text" 
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="İsminiz..."
                className="bg-transparent border-b border-yellow-500/50 text-center text-white text-lg p-2 focus:outline-none focus:border-yellow-500 mb-8 w-64 uppercase tracking-widest placeholder:text-white/20"
              />
              <button 
                disabled={!localName.trim()}
                onClick={() => {
                  localStorage.setItem('user_name', localName.trim());
                  handleViewChange('sentence');
                }}
                className="px-6 py-3 border border-yellow-500/50 text-yellow-500 rounded-sm tracking-[0.3em] font-light hover:bg-yellow-500 hover:text-black transition-all uppercase text-sm disabled:opacity-20 disabled:pointer-events-none"
              >
                Devam Et
              </button>
            </motion.div>
          )}`;

// Find where to insert it (after intro view)
const sentenceStartIdx = t.indexOf("{currentView === 'sentence' && (");
t = t.substring(0, sentenceStartIdx) + nameInputView + '\n          ' + t.substring(sentenceStartIdx);

// Fix "İsimsiz" fallback in Share features
t = t.replace(/user\?\.displayName \|\| 'İsimsiz'/g, "user?.displayName || localName || 'İsimsiz'");
t = t.replace(/user\.displayName \|\| 'İsimsiz'/g, "user.displayName || localName || 'İsimsiz'");

fs.writeFileSync('src/App.tsx', t);
