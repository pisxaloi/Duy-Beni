import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// remove leading slash in image strings
code = code.replace(/image: "\/([\w\-]+\.(png|jpg|mp3))"/g, 'image: "$1"');

// remove leading slash in src strings
code = code.replace(/src="\/([\w\-]+\.(png|jpg|mp3))"/g, 'src="$1"');

// remove leading slash in string template srcs
code = code.replace(/src=\{\`\/([^\}]+)\`\}/g, 'src={`$1`}');

// remove leading slash in audio initialization
code = code.replace(/new Audio\("\/([\w\-]+\.mp3)"\)/g, 'new Audio("$1")');

fs.writeFileSync('src/App.tsx', code);
