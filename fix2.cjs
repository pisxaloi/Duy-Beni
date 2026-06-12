const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/\{\s*img:\s*"\/151\.png",\s*view:\s*"unas_all"\s*\}/g, '{ icon: Book, view: "unas_all" }');
c = c.replace(/\{\s*img:\s*"\/152\.png",\s*view:\s*"eg_detail",\s*id:\s*"tuthankamun"\s*\}/g, '{ icon: Crown, view: "eg_detail", id: "tuthankamun" }');
c = c.replace(/\{\s*img:\s*"\/153\.png",\s*view:\s*"eg_detail",\s*id:\s*"amun_ra"\s*\}/g, '{ icon: Sun, view: "eg_detail", id: "amun_ra" }');
c = c.replace(/\{\s*img:\s*"\/154\.png",\s*view:\s*"eg_detail",\s*id:\s*"nefertiti"\s*\}/g, '{ icon: Sparkles, view: "eg_detail", id: "nefertiti" }');
c = c.replace(/\{\s*img:\s*"\/155\.png",\s*view:\s*"eg_detail",\s*id:\s*"bastet"\s*\}/g, '{ icon: Cat, view: "eg_detail", id: "bastet" }');
c = c.replace(/\{\s*img:\s*"\/156\.png",\s*view:\s*"eg_detail",\s*id:\s*"anubis"\s*\}/g, '{ icon: Eye, view: "eg_detail", id: "anubis" }');
c = c.replace(/\{\s*img:\s*"\/157\.png",\s*view:\s*"eg_detail",\s*id:\s*"thoth"\s*\}/g, '{ icon: BookOpen, view: "eg_detail", id: "thoth" }');
c = c.replace(/\{\s*img:\s*"\/158\.png",\s*view:\s*"eg_detail",\s*id:\s*"nut"\s*\}/g, '{ icon: Moon, view: "eg_detail", id: "nut" }');

c = c.replace("Eye,\n  Crown,\n  Leaf,", "Eye,\n  Crown,\n  Leaf,\n  Book,");

fs.writeFileSync('src/App.tsx', c);
