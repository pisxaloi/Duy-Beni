const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const mapNames = {
  "unas_all": "UNAS METİNLERİ",
  "tuthankamun": "TUTANKHAMUN",
  "amun_ra": "AMUN RA",
  "nefertiti": "NEFERTITI",
  "bastet": "BASTET",
  "anubis": "ANUBIS",
  "thoth": "THOTH",
  "nut": "NUT"
};

// First let's fix all arrays missing 'name'
c = c.replace(/\{ icon: Book,\s*view: "unas_all"(?:,\s*name: "[^"]*")? \}/g, '{ icon: Book, view: "unas_all", name: "UNAS METİNLERİ" }');
c = c.replace(/\{ icon: Crown,\s*view: "eg_detail",\s*id: "tuthankamun"(?:,\s*name: "[^"]*")? \}/g, '{ icon: Crown, view: "eg_detail", id: "tuthankamun", name: "TUTANKHAMUN" }');
c = c.replace(/\{ icon: Sun,\s*view: "eg_detail",\s*id: "amun_ra"(?:,\s*name: "[^"]*")? \}/g, '{ icon: Sun, view: "eg_detail", id: "amun_ra", name: "AMUN RA" }');
c = c.replace(/\{ icon: Sparkles,\s*view: "eg_detail",\s*id: "nefertiti"(?:,\s*name: "[^"]*")? \}/g, '{ icon: Sparkles, view: "eg_detail", id: "nefertiti", name: "NEFERTITI" }');
c = c.replace(/\{ icon: Cat,\s*view: "eg_detail",\s*id: "bastet"(?:,\s*name: "[^"]*")? \}/g, '{ icon: Cat, view: "eg_detail", id: "bastet", name: "BASTET" }');
c = c.replace(/\{ icon: Eye,\s*view: "eg_detail",\s*id: "anubis"(?:,\s*name: "[^"]*")? \}/g, '{ icon: Eye, view: "eg_detail", id: "anubis", name: "ANUBIS" }');
c = c.replace(/\{ icon: BookOpen,\s*view: "eg_detail",\s*id: "thoth"(?:,\s*name: "[^"]*")? \}/g, '{ icon: BookOpen, view: "eg_detail", id: "thoth", name: "THOTH" }');
c = c.replace(/\{ icon: Moon,\s*view: "eg_detail",\s*id: "nut"(?:,\s*name: "[^"]*")? \}/g, '{ icon: Moon, view: "eg_detail", id: "nut", name: "NUT" }');
c = c.replace(/\{ icon: Sparkles,\s*view: "283",\s*label: "283"(?:,\s*name: "[^"]*")? \}/g, '{ icon: Sparkles, view: "283", label: "283", name: "283 CÜMLE" }');


// Next let's fix the rendering part
const newRenderIcon = `{item.icon && (
                            <item.icon
                              size={32} className={currentView === item.view && (!item.id || item.id === activeEgDetail) ? "text-yellow-500 transition-colors relative z-20" : "text-white/40 group-hover:text-yellow-500 transition-colors relative z-20"}
                            />
                          )}
                          <div className="absolute right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black border border-white/20 text-[9px] uppercase tracking-widest text-white/50 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[300] shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                            {item.name}
                          </div>`;

const searchRegex = /\{item\.icon && \(\s*<item\.icon\s*size=\{32\} className=\{currentView === item\.view && \(!item\.id \|\| item\.id === activeEgDetail\) \? "text-yellow-500 transition-colors" : "text-white\/40 group-hover:text-yellow-500 transition-colors"\}\s*\/>\s*\)\}/g;

c = c.replace(searchRegex, newRenderIcon);

fs.writeFileSync('src/App.tsx', c);
