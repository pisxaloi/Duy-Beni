const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/className="flex-1 flex flex-col relative justify-start items-center pt-8 sm:pt-12 text-center overflow-x-hidden overflow-y-auto pb-4 w-full bg-black scrollbar-hide"/, 'className="flex-1 flex flex-col relative justify-start items-center pt-4 sm:pt-6 text-center overflow-x-hidden overflow-y-auto pb-2 w-full bg-black scrollbar-hide"');
c = c.replace(/<h2 className="text-white text-\[15px\] sm:text-lg font-extralight tracking-\[0.8em\] mb-4 shrink-0 uppercase ml-\[0.8em\] px-4\">/, '<h2 className="text-white text-[12px] sm:text-[14px] font-extralight tracking-[0.8em] mb-2 shrink-0 uppercase ml-[0.8em] px-4">');
c = c.replace(/<div className="w-full max-w-sm px-4 mb-4 shrink-0">/, '<div className="w-full max-w-sm px-4 mb-2 shrink-0">');
c = c.replace(/className="relative overflow-hidden rounded-md border border-yellow-500\/30 bg-zinc-900\/40 backdrop-blur-md p-5 flex flex-col items-center text-center shadow-\[0_0_20px_rgba\(234,179,8,0.1\)\]"/, 'className="relative overflow-hidden rounded-md border border-yellow-500/30 bg-zinc-900/40 backdrop-blur-md p-3 flex flex-col items-center text-center shadow-[0_0_20px_rgba(234,179,8,0.1)]"');

c = c.replace(/<h3 className="text-yellow-500 font-bold uppercase tracking-\[0.3em\] text-\[10px\] mb-3 relative z-10">/, '<h3 className="text-yellow-500 font-bold uppercase tracking-[0.3em] text-[9px] mb-1.5 relative z-10">');
c = c.replace(/<p className="text-white\/80 font-light text-\[10px\] leading-relaxed italic relative z-10 px-2">/, '<p className="text-white/80 font-light text-[9px] leading-snug italic relative z-10 px-2">');
c = c.replace(/<p className="text-white\/40 text-\[10px\] uppercase tracking-\[0.4em\] mt-3 relative z-10">/, '<p className="text-white/40 text-[8px] uppercase tracking-[0.3em] mt-1.5 relative z-10">');

c = c.replace(/className="w-full flex-1 flex flex-col justify-start mt-0 sm:mt-1 max-w-sm mx-auto min-h-0 px-2 sm:px-4 space-y-1 sm:space-y-1.5 pb-2"/, 'className="w-full flex-1 flex flex-col justify-start mt-0 max-w-sm mx-auto min-h-0 px-2 sm:px-4 space-y-0.5 pb-1"');

c = c.replace(/className=\{`w-14 h-14 sm:w-16 sm:h-16 ml-2 border border-white\/10 /g, 'className={`w-9 h-9 sm:w-10 sm:h-10 ml-2 border border-white/10 ');

c = c.replace(/<member\.icon size=\{32\} className=\{`relative z-10 transition-colors/g, '<member.icon size={18} className={`relative z-10 transition-colors');

fs.writeFileSync('src/App.tsx', c);
