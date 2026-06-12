const fs = require('fs');

let t = fs.readFileSync('src/App.tsx', 'utf-8');

t = t.replace(
  `            <div className="w-full h-[1px] bg-white/5 relative group transition-all hover:h-[2px]">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-yellow-500/40 group-hover:bg-yellow-500/60 shadow-[0_0_4px_rgba(234,179,8,0.2)]" 
                initial={{ width: 0 }}
                animate={{ width: \`\${volume * 100}%\` }}
              />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>`,
  `            <div className={\`w-full flex items-center justify-between px-4 py-1.5 \${['intro', 'search', 'sentence'].includes(currentView) ? 'bg-transparent' : 'bg-black/60 backdrop-blur-md border-t border-b border-white/5'}\`}>
              <span className="text-[8px] text-white/50 tracking-widest uppercase mr-2">SES</span>
              <div className="flex-1 h-1.5 bg-zinc-900 rounded-full relative overflow-hidden group">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-yellow-500" 
                  initial={{ width: 0 }}
                  animate={{ width: \`\${volume * 100}%\` }}
                />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={volume} 
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
              <span className="text-[8px] text-yellow-500 tracking-widest ml-2 w-6 text-right">{Math.round(volume * 100)}%</span>
            </div>`
);

fs.writeFileSync('src/App.tsx', t);
