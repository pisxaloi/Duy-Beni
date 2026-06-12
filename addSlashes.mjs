import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add leading slash in image strings
code = code.replace(/image: "([\w\-]+\.(png|jpg|mp3))"/g, 'image: "/$1"');

// Add leading slash in src strings
code = code.replace(/src="([\w\-]+\.(png|jpg|mp3))"/g, 'src="/$1"');

// Add leading slash in string template srcs (only if it doesn't already have one)
// We'll just be explicit.
code = code.replace(/src=\{\`([^\/][^\`]*)\`\}/g, 'src={`/$1`}');
code = code.replace(/src=\{\`\/\//g, 'src={`/'); // fix double slash if any

// Add leading slash in audio initialization
code = code.replace(/new Audio\("([\w\-]+\.mp3)"\)/g, 'new Audio("/$1")');

fs.writeFileSync('src/App.tsx', code);
