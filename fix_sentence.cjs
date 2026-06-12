const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
`              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
              const source = audioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              if (gainNodeRef.current) source.connect(gainNodeRef.current);
              else source.connect(audioContextRef.current!.destination);
              source.onended = () => {
                if (playVersionRef.current !== currentVersion) return;
                setIsPlaying(false);
                timeoutRef.current = setTimeout(() => speakSentence(index + 1, activeScript), 1200);
              };
              if (playVersionRef.current !== currentVersion) return;
              source.start();
              currentSourceRef.current = source;
              return; // skip network TTS`,
`              try {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
                const source = audioContextRef.current!.createBufferSource();
                source.buffer = audioBuffer;
                if (gainNodeRef.current) source.connect(gainNodeRef.current);
                else source.connect(audioContextRef.current!.destination);
                source.onended = () => {
                  if (playVersionRef.current !== currentVersion) return;
                  setIsPlaying(false);
                  timeoutRef.current = setTimeout(() => speakSentence(index + 1, activeScript), 1200);
                };
                if (playVersionRef.current !== currentVersion) return;
                source.start();
                currentSourceRef.current = source;
                return; // skip network TTS
              } catch (e) {
                console.warn("decodeAudioData failed for " + fn + ", using HTML5 Audio fallback");
                const audio = new Audio(fn);
                audio.volume = volume;
                (window as any).currentLocalAudio = audio;
                audio.onended = () => {
                  if (playVersionRef.current !== currentVersion) return;
                  setIsPlaying(false);
                  timeoutRef.current = setTimeout(() => speakSentence(index + 1, activeScript), 1200);
                };
                if (playVersionRef.current !== currentVersion) return;
                audio.play().catch(err => console.error("HTML5 Audio play failed:", err));
                currentSourceRef.current = { stop: () => audio.pause(), onended: null } as any;
                return;
              }`
);

fs.writeFileSync('src/App.tsx', c);
