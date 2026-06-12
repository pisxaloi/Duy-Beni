const fs = require('fs');

let t = fs.readFileSync('src/App.tsx', 'utf-8');

t = t.replace(/console\.error\("Speech Recognition API not found in this browser\."\);/g, 'alert("Sesli etkileşim için mikrofon izni gereklidir veya tarayıcınız (örn. bazı iOS tarayıcıları) desteklemiyor. Lütfen Safari kullanmayı deneyin veya metin ile yazın.");');

fs.writeFileSync('src/App.tsx', t);
