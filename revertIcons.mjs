import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace image: "something" with image: "/something"
code = code.replace(/image: "([\w\-]+\.png)"/g, 'image: "/$1"');

// Replace src="something.extension" with src="/something.extension"
code = code.replace(/src="([\w\-]+\.(png|jpg))"/g, 'src="/$1"');

// Replace src={`${var}`} with src={`/${var}`}
code = code.replace(/src=\{\`\$\{([^\}]+)\}\`/g, 'src={`/${$1}`');

// Replace src={`${var}.png`} with src={`/${var}.png`}
// Not needed if the above matches `${var}` correctly, but let's be careful.
// The above regex /src=\{\`\$\{([^\}]+)\}\`/g will match `src={`${item.img}` but NOT the closing }.
// Let's rewrite safely.
code = code.replace(/src=\{\`\$\{([^\}]+)\}\`\}/g, 'src={`/${$1}`}');
code = code.replace(/src=\{\`\$\{([^\}]+)\}\.png\`\}/g, 'src={`/${$1}.png`}');

fs.writeFileSync('src/App.tsx', code);
