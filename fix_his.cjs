const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
`                                  const response = await fetch("/his.mp3");
                                  if (!response.ok)
                                    throw new Error("his.mp3 not found");
                                  const arrayBuffer =
                                    await response.arrayBuffer();
                                  const audioBuffer =
                                    await audioContextRef.current!.decodeAudioData(
                                      arrayBuffer,
                                    );
                                  const source =
                                    audioContextRef.current!.createBufferSource();
                                  source.buffer = audioBuffer;
                                  if (gainNodeRef.current) {
                                    source.connect(gainNodeRef.current);
                                  } else {
                                    source.connect(
                                      audioContextRef.current!.destination,
                                    );
                                  }

                                  source.onended = () => {
                                    if (
                                      currentIndex <
                                      questionScript.length - 1
                                    ) {
                                      timeoutRef.current = setTimeout(() => {
                                        speakSentence(
                                          currentIndex + 1,
                                          questionScript,
                                        );
                                      }, 1000);
                                    }
                                  };

                                  currentSourceRef.current = source;
                                  source.start(0);
                                } catch (e) {
                                  // Fallback: immediately proceed if error
                                  if (
                                    currentIndex <
                                    questionScript.length - 1
                                  ) {
                                    timeoutRef.current = setTimeout(() => {
                                      speakSentence(
                                        currentIndex + 1,
                                        questionScript,
                                      );
                                    }, 1000);
                                  }
                                }`,
`                                  const response = await fetch("/his.mp3");
                                  if (!response.ok)
                                    throw new Error("his.mp3 not found");
                                  const arrayBuffer =
                                    await response.arrayBuffer();
                                  const audioBuffer =
                                    await audioContextRef.current!.decodeAudioData(
                                      arrayBuffer,
                                    );
                                  const source =
                                    audioContextRef.current!.createBufferSource();
                                  source.buffer = audioBuffer;
                                  if (gainNodeRef.current) {
                                    source.connect(gainNodeRef.current);
                                  } else {
                                    source.connect(
                                      audioContextRef.current!.destination,
                                    );
                                  }

                                  source.onended = () => {
                                    if (
                                      currentIndex <
                                      questionScript.length - 1
                                    ) {
                                      timeoutRef.current = setTimeout(() => {
                                        speakSentence(
                                          currentIndex + 1,
                                          questionScript,
                                        );
                                      }, 1000);
                                    }
                                  };

                                  currentSourceRef.current = source;
                                  source.start(0);
                                } catch (e) {
                                  console.warn("decodeAudioData failed for his.mp3, using HTML5 Audio fallback");
                                  const audio = new Audio("/his.mp3");
                                  audio.volume = volume;
                                  (window as any).currentLocalAudio = audio;
                                  audio.onended = () => {
                                    if (
                                      currentIndex <
                                      questionScript.length - 1
                                    ) {
                                      timeoutRef.current = setTimeout(() => {
                                        speakSentence(
                                          currentIndex + 1,
                                          questionScript,
                                        );
                                      }, 1000);
                                    }
                                  };
                                  audio.play().catch(err => {
                                    console.error("HTML5 Audio play failed for his", err);
                                    if (
                                      currentIndex <
                                      questionScript.length - 1
                                    ) {
                                      timeoutRef.current = setTimeout(() => {
                                        speakSentence(
                                          currentIndex + 1,
                                          questionScript,
                                        );
                                      }, 1000);
                                    }
                                  });
                                  currentSourceRef.current = { stop: () => audio.pause(), onended: null } as any;
                                }`
);

fs.writeFileSync('src/App.tsx', c);
