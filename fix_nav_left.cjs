const fs = require('fs');

let t = fs.readFileSync('src/App.tsx', 'utf-8');

t = t.replace(
  `            {/* Nav Left */}
            <div className="flex flex-col-reverse gap-2 relative">

              {user && !['intro', 'search', 'sentence'].includes(currentView) && (
                <>
                  <div className="relative group">
                    <button 
                      onClick={() => handleViewChange('sentence')} 
                      className="w-auto h-auto px-1 py-2 text-white/70 hover:text-yellow-500 transition-all flex items-center justify-center text-base hover:scale-110 drop-shadow-md"
                    >
                      ❌ 💬 👎
                    </button>
                    <div className="absolute left-full ml-2 bottom-0 w-48 p-3 rounded-md bg-zinc-900/90 backdrop-blur-md border border-yellow-500/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[140] text-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                      <p className="text-yellow-500 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">CÜMLELER</p>
                      <p className="text-white/70 text-[9px] leading-relaxed font-light">Cevaplar yetersiz ise cümle sayısını arttır. Sevdiğin cümleyi seç.</p>
                    </div>
                  </div>
                </>
              )}
            </div>`,
  `            {/* Nav Left */}
            <div className="flex flex-col justify-end items-center relative pl-3 pb-1">
              {user && !['intro', 'search', 'sentence'].includes(currentView) && (
                <div className="relative group flex flex-col items-center justify-end">
                  {/* Expanding Text Bar */}
                  <div className="h-0 group-hover:h-28 opacity-0 group-hover:opacity-100 transition-all duration-500 overflow-hidden flex flex-col justify-end items-center mb-2 pointer-events-none origin-bottom">
                    <div className="py-3 px-1.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-yellow-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                      <span className="text-yellow-500 text-[8px] font-bold tracking-[0.4em] uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>CÜMLELER</span>
                    </div>
                  </div>
                  
                  {/* Emojis stacked */}
                  <button 
                    onClick={() => handleViewChange('sentence')} 
                    className="flex flex-col gap-2 text-white/50 hover:text-white transition-all items-center text-[15px] drop-shadow-md bg-black/20 backdrop-blur-sm p-1.5 rounded-full border border-white/5 group-hover:border-yellow-500/30"
                  >
                    <span className="hover:scale-125 hover:text-yellow-500 transition-all cursor-pointer">❌</span>
                    <span className="hover:scale-125 hover:text-yellow-500 transition-all cursor-pointer">💬</span>
                    <span className="hover:scale-125 hover:text-yellow-500 transition-all cursor-pointer">👎</span>
                  </button>
                </div>
              )}
            </div>`
);

fs.writeFileSync('src/App.tsx', t);
