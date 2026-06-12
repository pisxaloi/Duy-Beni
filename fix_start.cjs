const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
`          };
          source.start();
          currentSourceRef.current = source;
        } else {`,
`          };
          
          if (playVersionRef.current !== currentVersion) return;
          source.start();
          currentSourceRef.current = source;
        } else {`
);

c = c.replace(
`              source.onended = () => {
                if (playVersionRef.current !== currentVersion) return;
                setIsPlaying(false);
                timeoutRef.current = setTimeout(() => speakSentence(index + 1, activeScript), 1200);
              };
              source.start();
              currentSourceRef.current = source;`,
`              source.onended = () => {
                if (playVersionRef.current !== currentVersion) return;
                setIsPlaying(false);
                timeoutRef.current = setTimeout(() => speakSentence(index + 1, activeScript), 1200);
              };
              if (playVersionRef.current !== currentVersion) return;
              source.start();
              currentSourceRef.current = source;`
);

fs.writeFileSync('src/App.tsx', c);
