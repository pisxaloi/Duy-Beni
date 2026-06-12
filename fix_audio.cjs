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

        const audio = new Audio(audioUrl);
        audio.volume = volume;
        (window as any).currentLocalAudio = audio;

        audio.onloadedmetadata = () => {
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
             console.error("Audio play failed:", e);
             if (isUnmounted) return;
             speakSentence(0, script);
          });
          rafId = requestAnimationFrame(checkTime);
        };

        audio.onended = () => {
          if (isUnmounted) return;
          cancelAnimationFrame(rafId);
          setIsPlaying(false);
          if (onEnded) onEnded();
        };

        audio.onerror = () => {
          console.error("Audio error on " + audioUrl);
          if (isUnmounted) return;
          speakSentence(0, script);
        };

      } catch (e) {
        console.error(e);
        if (isUnmounted) return;
        speakSentence(0, script);
      }
    };
`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', c);
