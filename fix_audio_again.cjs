const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const playFullAudioWithTimings = async \([\s\S]*?speakSentence\(0, script\);\s*\n\s*\}\n\s*\};\n/m;

const replacement = `const playFullAudioWithTimings = async (script: string[], audioUrl: string, onEnded?: () => void) => {
      try {
        setIsPlaying(true);
        setCurrentIndex(-1);

        const getTimings = (duration: number) => {
          const getWeight = (text: string) => text.length + text.split(/[.,!?]/).length * 15;
          const weights = script.map((t) => getWeight(t));
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let cumulativeTime = 0;
          return weights.map((weight: number) => {
            const time = cumulativeTime;
            cumulativeTime += (weight / totalWeight) * duration;
            return time;
          });
        };

        if (!audioContextRef.current) await initAudio();
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error("Audio not found: " + audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        let source: AudioBufferSourceNode | null = null;

        try {
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          if (isUnmounted) return;

          source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBuffer;

          if (gainNodeRef.current) {
            source.connect(gainNodeRef.current);
          } else {
            source.connect(audioContextRef.current!.destination);
          }

          source.onended = () => {
            if (isUnmounted) return;
            cancelAnimationFrame(rafId);
            setIsPlaying(false);
            if (onEnded) onEnded();
          };

          currentSourceRef.current = source;
          const startTime = audioContextRef.current!.currentTime;
          const timings = getTimings(audioBuffer.duration);

          const checkTime = () => {
             if (isUnmounted) return;
             const currentTime = audioContextRef.current!.currentTime - startTime;
             let newIndex = 0;
             for (let i = timings.length - 1; i >= 0; i--) {
                if (currentTime >= timings[i]) {
                  newIndex = i;
                  break;
                }
             }
             setCurrentIndex(newIndex);
             rafId = requestAnimationFrame(checkTime);
          };

          source.start(0);
          rafId = requestAnimationFrame(checkTime);

        } catch (decodeErr) {
          console.warn("decodeAudioData failed, trying HTML5 Audio fallback for " + audioUrl, decodeErr);
          
          if (isUnmounted) return;
          const audio = new Audio(audioUrl);
          audio.volume = volume;
          (window as any).currentLocalAudio = audio;

          const onReady = () => {
            if (isUnmounted) return;
            const timings = getTimings(audio.duration);
            
            const checkTime = () => {
              if (isUnmounted) return;
              const currentTime = audio.currentTime;
              let newIndex = 0;
              for (let i = timings.length - 1; i >= 0; i--) {
                if (currentTime >= timings[i]) {
                  newIndex = i;
                  break;
                }
              }
              setCurrentIndex(newIndex);
              rafId = requestAnimationFrame(checkTime);
            };

            audio.play().catch(e => {
               console.error("HTML5 Audio play failed:", e);
               if (isUnmounted) return;
               speakSentence(0, script);
            });
            rafId = requestAnimationFrame(checkTime);
          };

          if (audio.readyState >= 1) {
             onReady();
          } else {
             audio.onloadedmetadata = onReady;
          }

          audio.onended = () => {
            if (isUnmounted) return;
            cancelAnimationFrame(rafId);
            setIsPlaying(false);
            if (onEnded) onEnded();
          };

          audio.onerror = () => {
             console.error("HTML5 Audio error on " + audioUrl);
             if (isUnmounted) return;
             speakSentence(0, script);
          };
          
          currentSourceRef.current = { stop: () => audio.pause(), onended: null } as any;
        }

      } catch (e) {
        console.error(e);
        if (isUnmounted) return;
        speakSentence(0, script);
      }
    };
`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', c);
console.log("Replaced playFullAudioWithTimings");
