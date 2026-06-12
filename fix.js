const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace src="/something" with src="something"
code = code.replace(/src=\"\//g, 'src="');

// Replace src={`/something`} with src={`something`}
code = code.replace(/src=\{\`\//g, 'src={`');

// Replace fileName = `/cc with fileName = `cc
code = code.replace(/fileName = \`\/cc/g, 'fileName = `cc');

// Replace fetch("/girismetin with fetch("girismetin
code = code.replace(/fetch\("\/girismetin/g, 'fetch("girismetin');

// Replace image: "/something" with image: "something" in state
code = code.replace(/image: "\//g, 'image: "');

fs.writeFileSync('src/App.tsx', code);
