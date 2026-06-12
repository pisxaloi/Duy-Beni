const fs = require('fs');

let t = fs.readFileSync('src/App.tsx', 'utf-8');

const replacement = `               <button 
                 onClick={() => handleViewChange('day')} 
                 className="absolute top-4 left-4 z-[120] p-2 group bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:border-yellow-500/50 transition-all font-bold"
               >
                 <RotateCcw size={16} className="text-white group-hover:text-yellow-500 transition-colors" />
               </button>

               <div className="absolute top-4 right-4 flex flex-row gap-3 z-[150]">
                 <button onClick={() => {
                   const shareText = \`DERİN BAĞ:\\n\n\${detailedExplanation || ""}\\n\\nPİRAMİT REZONANSI:\\n\${dailyMessage?.ancientMeaning || ""}\\n\\nJUNG REZONANSI:\\n\${dailyMessage?.jungNote || ""}\`;
                   if (navigator.share) {
                     navigator.share({
                       title: 'Derin Bağ İncelemesi',
                       text: shareText,
                     }).catch(console.error);
                   } else {
                     navigator.clipboard.writeText(shareText);
                   }
                 }} className="p-2 group bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:border-yellow-500/50 transition-all text-white hover:text-yellow-500 shadow-lg drop-shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                   <Share2 size={16} className="text-white group-hover:text-yellow-500 transition-colors" />
                 </button>
               </div>`;

t = t.replace(
  `               <button 
                 onClick={() => handleViewChange('day')} 
                 className="absolute top-4 left-4 z-[120] p-2 group bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:border-yellow-500/50 transition-all font-bold"
               >
                 <RotateCcw size={16} className="text-white group-hover:text-yellow-500 transition-colors" />
               </button>`,
  replacement
);

fs.writeFileSync('src/App.tsx', t);
