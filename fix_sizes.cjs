const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Right Sidebar Buttons container
c = c.replace(/className=\{`w-8 h-8 md:w-10 md:h-10/g, 'className={`w-12 h-12 md:w-14 md:h-14');

// 2. Right Sidebar Icons size
c = c.replace(/size=\{20\}\s+className=\{currentView === item.view && \(!item.id \|\| item.id === activeEgDetail\) \? "text-yellow-500 transition-colors" : "text-white\/40 group-hover:text-yellow-500 transition-colors"\}/g, 'size={32} className={currentView === item.view && (!item.id || item.id === activeEgDetail) ? "text-yellow-500 transition-colors" : "text-white/40 group-hover:text-yellow-500 transition-colors"}');

// 3. Klanım List Icons container
c = c.replace(/className=\{`w-8 h-8 sm:w-10 sm:h-10 ml-2/g, 'className={`w-14 h-14 sm:w-16 sm:h-16 ml-2');

// 4. Klanım List Icons size
// Wait, the Klanım size=20 is right after <member.icon
// className={`relative z-10 transition-colors ${isActive ? "text-yellow-500" : isPending ? "text-[#25D366]" : "text-white/40 group-hover:text-yellow-500/80"}`}
c = c.replace(/<member\.icon\s*size=\{20\}\s*className=\{`relative z-10 transition-colors/g, '<member.icon size={32} className={`relative z-10 transition-colors');

// 5. Kadim Mısır Grid Icons container & text size
c = c.replace(/<item\.icon className="w-8 h-8 text-white\/40 group-hover:text-yellow-500 transition-colors z-10" \/>/g, '<item.icon className="w-14 h-14 text-white/40 group-hover:text-yellow-500 transition-colors z-10" />');
c = c.replace(/<span className="text-\[9px\] text-white\/50 group-hover:text-yellow-500 font-bold uppercase tracking-widest">\{item\.title\}<\/span>/g, '<span className="text-[11px] text-white/50 group-hover:text-yellow-500 font-bold uppercase tracking-widest">{item.title}</span>');

// 6. Bottom Navigation Icons
c = c.replace(/\) : item\.icon \? \(\s*<item\.icon\s*size=\{20\}/g, ') : item.icon ? (\n                          <item.icon\n                            size={32}');

fs.writeFileSync('src/App.tsx', c);
