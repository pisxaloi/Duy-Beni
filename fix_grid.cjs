const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/\{\s*img:\s*"\/151",\s*view:\s*"unas_all",\s*title:\s*"UNAS METİNLERİ",\s*\}/g, '{ icon: Book, view: "unas_all", title: "UNAS METİNLERİ", }');
c = c.replace(/\{\s*img:\s*"\/152",\s*view:\s*"eg_detail",\s*detail:\s*"tuthankamun",\s*title:\s*"TUTANKHAMUN",\s*\}/g, '{ icon: Crown, view: "eg_detail", detail: "tuthankamun", title: "TUTANKHAMUN", }');
c = c.replace(/\{\s*img:\s*"\/153",\s*view:\s*"eg_detail",\s*detail:\s*"amun_ra",\s*title:\s*"AMUN RA",\s*\}/g, '{ icon: Sun, view: "eg_detail", detail: "amun_ra", title: "AMUN RA", }');
c = c.replace(/\{\s*img:\s*"\/154",\s*view:\s*"eg_detail",\s*detail:\s*"nefertiti",\s*title:\s*"NEFERTITI",\s*\}/g, '{ icon: Sparkles, view: "eg_detail", detail: "nefertiti", title: "NEFERTITI", }');
c = c.replace(/\{\s*img:\s*"\/155",\s*view:\s*"eg_detail",\s*detail:\s*"bastet",\s*title:\s*"BASTET",\s*\}/g, '{ icon: Cat, view: "eg_detail", detail: "bastet", title: "BASTET", }');
c = c.replace(/\{\s*img:\s*"\/156",\s*view:\s*"eg_detail",\s*detail:\s*"anubis",\s*title:\s*"ANUBIS",\s*\}/g, '{ icon: Eye, view: "eg_detail", detail: "anubis", title: "ANUBIS", }');
c = c.replace(/\{\s*img:\s*"\/157",\s*view:\s*"eg_detail",\s*detail:\s*"thoth",\s*title:\s*"THOTH",\s*\}/g, '{ icon: BookOpen, view: "eg_detail", detail: "thoth", title: "THOTH", }');
c = c.replace(/\{\s*img:\s*"\/158",\s*view:\s*"eg_detail",\s*detail:\s*"nut",\s*title:\s*"NUT",\s*\}/g, '{ icon: Moon, view: "eg_detail", detail: "nut", title: "NUT", }');

fs.writeFileSync('src/App.tsx', c);
