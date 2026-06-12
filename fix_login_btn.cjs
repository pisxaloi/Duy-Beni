const fs = require('fs');

let t = fs.readFileSync('src/App.tsx', 'utf-8');

t = t.replace(
  `              {!user && (
                <button onClick={login} className="w-10 h-10 bg-yellow-500 rounded-full text-black shadow-lg flex items-center justify-center">
                  <LogIn size={20} />
                </button>
              )}`,
  ""
);

fs.writeFileSync('src/App.tsx', t);
