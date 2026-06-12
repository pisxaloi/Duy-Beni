import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/src=\"\//g, 'src="');
code = code.replace(/src=\{\`\//g, 'src={`');
code = code.replace(/fileName = \`\/cc/g, 'fileName = `cc');
code = code.replace(/fetch\("\/girismetin/g, 'fetch("girismetin');
code = code.replace(/image: "\//g, 'image: "');
fs.writeFileSync('src/App.tsx', code);
