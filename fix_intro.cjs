const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
`          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          
          if (isUnmounted) return;

          const source = audioContextRef.current!.createBufferSource();
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
            handleViewChange("sentence");
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
        } catch (e) {
          // generic fallback if fetch fails
          console.error(e);
        }`,
`          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          
          if (isUnmounted) return;

          const source = audioContextRef.current!.createBufferSource();
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
            handleViewChange("sentence");
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
        } catch (e) {
          console.warn("decodeAudioData failed or fetch failed, falling back to HTML5 Audio", e);
          const audio = new Audio("/girismetin.mp3");
          audio.volume = volume;
          (window as any).currentLocalAudio = audio;
          
          audio.onloadedmetadata = () => {
            if (isUnmounted) return;
            const timings = getTimings(audio.duration);
            const checkTime = () => {
              if (isUnmounted) return;
              let newIndex = 0;
              for (let i = timings.length - 1; i >= 0; i--) {
                if (audio.currentTime >= timings[i]) {
                  newIndex = i;
                  break;
                }
              }
              setCurrentIndex(newIndex);
              rafId = requestAnimationFrame(checkTime);
            };
            audio.play().catch(err => console.error("HTML5 Audio play failed", err));
            rafId = requestAnimationFrame(checkTime);
          };
          audio.onended = () => {
            if (isUnmounted) return;
            cancelAnimationFrame(rafId);
            setIsPlaying(false);
            handleViewChange("sentence");
          };
          currentSourceRef.current = { stop: () => audio.pause(), onended: null } as any;
        }`
);

fs.writeFileSync('src/App.tsx', c);
