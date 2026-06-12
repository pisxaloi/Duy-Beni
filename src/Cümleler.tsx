import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Check, CheckCircle2 } from "lucide-react";
import BottomNav from "./BottomNav";

interface MisirSentenceProps {
  questionScript: string[];
  selectedIndices: number[];
  rejectedIndices: number[];
  currentIndex: number;
  speakSentence: ((index: number, script: string[], voiceType: string) => void) | null;
  onBack: () => void;
  onNavigate: (view: string) => void;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onFinish?: (selected: number[], rejected: number[], script: string[]) => void;
  volume: number;
  onSpeakSentenceRef?: (fn: (index: number, script: string[], voiceType: string) => void) => void;
}

const MisirSentence: React.FC<MisirSentenceProps> = ({
  questionScript,
  selectedIndices,
  rejectedIndices,
  currentIndex: externalCurrentIndex,
  speakSentence: externalSpeakSentence,
  onBack,
  onNavigate,
  onAccept,
  onReject,
  onFinish,
  volume,
  onSpeakSentenceRef,
}) => {
  // İç state'ler
  const [localCurrentIndex, setLocalCurrentIndex] = useState(externalCurrentIndex);
  const [localSelectedIndices, setLocalSelectedIndices] = useState<number[]>(selectedIndices);
  const [localRejectedIndices, setLocalRejectedIndices] = useState<number[]>(rejectedIndices);
  const [isPlaying, setIsPlaying] = useState(false);
  const [geminiQuotaError, setGeminiQuotaError] = useState(false);
  const [localScript, setLocalScript] = useState<string[]>(questionScript);

  // Refler
  const playVersionRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSourceRef = useRef<any>(null);
  const currentUtteranceRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const currentIndexRef = useRef(localCurrentIndex);
  const selectedIndicesRef = useRef(localSelectedIndices);
  const scriptRef = useRef(localScript);


  // Refleri state'lerle senkronize tut
  useEffect(() => { currentIndexRef.current = localCurrentIndex; }, [localCurrentIndex]);
  useEffect(() => { selectedIndicesRef.current = localSelectedIndices; }, [localSelectedIndices]);
  useEffect(() => { scriptRef.current = localScript; }, [localScript]);

  // Dış currentIndex değişince iç state'i güncelle
  useEffect(() => {
    setLocalCurrentIndex(externalCurrentIndex);
  }, [externalCurrentIndex]);

  useEffect(() => {
    setLocalSelectedIndices(selectedIndices);
  }, [selectedIndices]);

  useEffect(() => {
    setLocalRejectedIndices(rejectedIndices);
  }, [rejectedIndices]);

  useEffect(() => {
    if (questionScript.length > 0) {
      setLocalScript(questionScript);
    }
  }, [questionScript]);


  // AudioContext başlatma
  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
    // Gain node oluştur
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = volume;
      gainNodeRef.current.connect(audioContextRef.current.destination);
    } else {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // Ses temizliği
  const cleanupEgyptAudio = useCallback(() => {
    if (currentSourceRef.current) {
      if (currentSourceRef.current.onended) currentSourceRef.current.onended = null;
      try { currentSourceRef.current.stop(); } catch (e) {}
      currentSourceRef.current = null;
    }
    if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
      try {
        (window as any).currentLocalAudio.pause();
        (window as any).currentLocalAudio.currentTime = 0;
      } catch (e) {}
      (window as any).currentLocalAudio = null;
    }
    currentUtteranceRef.current = null;
  }, []);

  // speakSentence fonksiyonu
  const speakSentence = useCallback(async (index: number, activeScript: string[], voiceStyle: string = "default") => {
    if (index >= activeScript.length) {
      setIsPlaying(false);
      return;
    }

    // Versiyonu artır
    playVersionRef.current++;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    cleanupEgyptAudio();
    if (currentSourceRef.current) {
      if (currentSourceRef.current.onended) currentSourceRef.current.onended = null;
      try { currentSourceRef.current.stop(); } catch (e) {}
      currentSourceRef.current = null;
    }
    if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
      try {
        (window as any).currentLocalAudio.pause();
        (window as any).currentLocalAudio.currentTime = 0;
      } catch (e) {}
      (window as any).currentLocalAudio = null;
    }
    currentUtteranceRef.current = null;
    setIsPlaying(true);

    const currentVersion = playVersionRef.current;

    const playUsingNetworkTTS = async () => {
      try {
        if (geminiQuotaError) {
          throw new Error("Lokal ses sentezi modu (429 Quota Exceeded)");
        }
        await initAudio();

        let prefix = "cc";

        if (prefix) {
          const fn = `/${prefix}${(index + 1).toString().padStart(2, '0')}.mp3`;
          try {
            const response = await fetch(fn, { method: 'HEAD' });
            if (response.ok) {
              const audioReq = await fetch(fn);
              if (audioReq.ok) {
                const arrayBuffer = await audioReq.arrayBuffer();
                const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
                const source = audioContextRef.current!.createBufferSource();
                source.buffer = audioBuffer;
                if (gainNodeRef.current) source.connect(gainNodeRef.current);
                else source.connect(audioContextRef.current!.destination);
                source.onended = () => {
                  if (playVersionRef.current !== currentVersion) return;
                  setIsPlaying(false);
                  timeoutRef.current = setTimeout(() => speakSentence(index + 1, activeScript, voiceStyle), 1200);
                };
                if (playVersionRef.current !== currentVersion) return;
                // Metni sesle aynı anda değiştir
                setLocalCurrentIndex(index);
                source.start();
                currentSourceRef.current = source;
                return;
              }
            }
          } catch (e) {
            console.warn("Failed to play chunked audio:", fn, e);
          }
        }

        throw new Error("No local audio available, using speechSynthesis fallback");
      } catch (err: any) {
        if (playVersionRef.current !== currentVersion) return;
        console.warn("TTS fallback activated due to error:", err);
        const errMsg = err?.message || "";
        const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || JSON.stringify(err).includes("RESOURCE_EXHAUSTED") || JSON.stringify(err).includes("429");
        if (isQuota) {
          setGeminiQuotaError(true);
        }

        const utterance = new SpeechSynthesisUtterance(activeScript[index]);
        currentUtteranceRef.current = utterance;
        (window as any).ttsUtterances = (window as any).ttsUtterances || [];
        (window as any).ttsUtterances.push(utterance);
        utterance.lang = "tr-TR";

        const performSpeech = () => {
          const voices = window.speechSynthesis.getVoices();

          if (voiceStyle === "daily") {
            const shuffled = [...voices].sort(() => Math.random() - 0.5);
            const selectedVoice = shuffled[0];
            if (selectedVoice) {
              utterance.voice = selectedVoice;
              utterance.rate = 0.82;
              utterance.pitch = Math.random() * 0.4 + 0.8;
            }
          } else {
            utterance.rate = 0.78;
            utterance.pitch = 1.05;

            const trVoices = voices.filter((v: any) => v.lang.includes("tr"));
            let femaleVoice = trVoices.find((v: any) =>
              v.name.toLowerCase().includes("yelda")
            );
            if (!femaleVoice) {
              femaleVoice = trVoices.find((v: any) =>
                v.name.toLowerCase().includes("zeynep")
              );
            }
            if (!femaleVoice) {
              femaleVoice = trVoices.find((v: any) =>
                v.name.toLowerCase().includes("kadın") ||
                v.name.toLowerCase().includes("female") ||
                v.name.toLowerCase().includes("emine") ||
                v.name.toLowerCase().includes("siri") ||
                v.name.toLowerCase().includes("ayşe")
              );
            }
            if (!femaleVoice) {
              femaleVoice = trVoices.find((v: any) => !v.name.toLowerCase().includes("tolga"));
            }
            if (femaleVoice) {
              utterance.voice = femaleVoice;
            } else if (trVoices.length > 0) {
              utterance.voice = trVoices[0];
            }
          }

          utterance.volume = 1;
          utterance.onend = () => {
            if (currentUtteranceRef.current !== utterance || playVersionRef.current !== currentVersion) return;
            setIsPlaying(false);
            timeoutRef.current = setTimeout(() => speakSentence(index + 1, activeScript, voiceStyle), 1200);
          };
          // Metni sesle aynı anda değiştir
          setLocalCurrentIndex(index);
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.speak(utterance);
          }
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            performSpeech();
          };
        } else {
          performSpeech();
        }
      }
    };

    playUsingNetworkTTS();

  }, [initAudio, cleanupEgyptAudio, geminiQuotaError]);

  // Dış speakSentence referansını bildir
  useEffect(() => {
    if (onSpeakSentenceRef) {
      onSpeakSentenceRef(speakSentence);
    }
  }, [speakSentence, onSpeakSentenceRef]);

  // questionScript boşsa hardcoded personaPhrases kullan (cc01.mp3 - cc16.mp3 ile eşleşen)
  const PERSONA_PHRASES = [
    "Ben yıldızlardan geldim, göklere aitim.",
    "Sorgulanmayan hayat, yaşanmaya değmez.",
    "Korkularımla yüzleşir, içimdeki aslanı uyandırırım.",
    "Kurallar ve disiplin, ruhun kalesidir.",
    "Yaşadığım yer ve şartlar, benim kaderimdir.",
    "Asaletim sessizliğimde, gücüm duruşumdadır.",
    "Ödevim ve sorumluluğum, her arzudan üstündür.",
    "Eski benliğimi yaktım, küllerimden doğuyorum.",
    "Gerçeğin ışığı, geçici mutluluktan değerlidir.",
    "Rüyalarım, ruhumun bana gönderdiği mesajlardır.",
    "Birlik olanı ve kökü derinde olanı kimse yıkamaz.",
    "Mantık, karanlık yolları aydınlatan tek fenerdir.",
    "Geleneklere bağlılık, geleceğe atılan en sağlam adımdır.",
    "İçimdeki ilham, ortaya çıkacağı doğru anı bekler.",
    "Kendi müziğime göre dans eder, kalıplara sığmam.",
    "Her kararım, tüm dünya için bir yasa olmalıdır.",
  ];

  useEffect(() => {
    if (localScript.length === 0) {
      const selected = PERSONA_PHRASES.slice(0, 16);
      setLocalScript(selected);
      setLocalCurrentIndex(0);
      const timer = setTimeout(() => {
        speakSentence(0, selected, "default");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // İlk cümleyi otomatik seslendir
  useEffect(() => {
    if (localScript.length > 0 && localCurrentIndex < localScript.length) {
      const timer = setTimeout(() => {
        speakSentence(localCurrentIndex, localScript, "default");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [localScript.length > 0]);

  // Temizlik
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      cleanupEgyptAudio();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanupEgyptAudio]);

  // İptal (X) butonu işleyicisi
  const handleReject = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Önce sesi durdur
    cleanupEgyptAudio();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
      try {
        (window as any).currentLocalAudio.pause();
        (window as any).currentLocalAudio.currentTime = 0;
      } catch (e) {}
      (window as any).currentLocalAudio = null;
    }

    const idx = currentIndexRef.current;
    const script = scriptRef.current;
    const selected = selectedIndicesRef.current;

    if (!localRejectedIndices.includes(idx)) {
      setLocalRejectedIndices([...localRejectedIndices, idx]);
      setLocalSelectedIndices(selected.filter((i: number) => i !== idx));
      onReject(idx);

      if (idx < script.length - 1) {
        const nextIndex = idx + 1;
        timeoutRef.current = setTimeout(() => {
          speakSentence(nextIndex, script, "default");
        }, 1200);
      }
    } else {
      setLocalRejectedIndices(localRejectedIndices.filter((i: number) => i !== idx));
    }
  }, [localRejectedIndices, speakSentence, onReject, cleanupEgyptAudio]);



  // Seç (✓) butonu işleyicisi
  const handleAccept = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const idx = currentIndexRef.current;
    const script = scriptRef.current;
    const selected = selectedIndicesRef.current;

    if (!selected.includes(idx)) {
      setLocalSelectedIndices([...selected, idx]);
      setLocalRejectedIndices(localRejectedIndices.filter((i) => i !== idx));
      onAccept(idx);

      const playHisAndNext = async () => {
        try {
          if (!audioContextRef.current) await initAudio();
          const response = await fetch("/his.mp3");
          if (!response.ok) throw new Error("his.mp3 not found");
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          const source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBuffer;
          if (gainNodeRef.current) {
            source.connect(gainNodeRef.current);
          } else {
            source.connect(audioContextRef.current!.destination);
          }

          source.onended = () => {
            if (idx < script.length - 1) {
              timeoutRef.current = setTimeout(() => {
                speakSentence(idx + 1, script, "default");
              }, 1000);
            }
          };

          currentSourceRef.current = source;
          source.start(0);
        } catch (e) {
          console.warn("decodeAudioData failed for his.mp3, using HTML5 Audio fallback");
          const audio = new Audio("/his.mp3");
          audio.volume = volume;
          if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
            try { (window as any).currentLocalAudio.pause(); } catch (e) {}
          }
          (window as any).currentLocalAudio = audio;
          audio.onended = () => {
            if ((window as any).currentLocalAudio === audio) {
              if (idx < script.length - 1) {
                timeoutRef.current = setTimeout(() => {
                  speakSentence(idx + 1, script, "default");
                }, 1000);
              }
            }
          };
          audio.play().catch(err => {
            console.error("HTML5 Audio play failed for his", err);
            if ((window as any).currentLocalAudio === audio) {
              if (idx < script.length - 1) {
                timeoutRef.current = setTimeout(() => {
                  speakSentence(idx + 1, script, "default");
                }, 1000);
              }
            }
          });
          currentSourceRef.current = { stop: () => audio.pause(), onended: null } as any;
        }
      };

      const currentAudio = (window as any).currentLocalAudio;
      if (currentAudio) { currentAudio.pause(); }
      if ((window as any).speechSynthesis) { window.speechSynthesis.cancel(); }

      playHisAndNext();
    } else {
      setLocalSelectedIndices(selected.filter((i: number) => i !== idx));
    }
  }, [localRejectedIndices, speakSentence, onAccept, initAudio, volume]);


  // Önceki butonu
  const handlePrevious = useCallback(() => {
    if (localCurrentIndex > 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      speakSentence(localCurrentIndex - 1, localScript, "default");
    }
  }, [localCurrentIndex, localScript, speakSentence]);

  // Sonraki butonu
  const handleNext = useCallback(() => {
    if (localCurrentIndex < localScript.length - 1) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      speakSentence(localCurrentIndex + 1, localScript, "default");
    }
  }, [localCurrentIndex, localScript, speakSentence]);

  // Analiz et / bitir butonu
  const handleFinish = useCallback(() => {
    localStorage.setItem("has_launched", "true");
    // Seçilen cümleleri App'e bildir, o da mesaj üretip home'a yönlendirsin
    if (onFinish) {
      onFinish(localSelectedIndices, localRejectedIndices, localScript);
    } else {
      // Fallback: direkt home'a git
      onNavigate("home");
    }
  }, [onFinish, onNavigate, localSelectedIndices, localRejectedIndices, localScript]);

  return (
    <>
    <motion.div

      key="sentence"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col relative w-full h-full items-center justify-center overflow-hidden bg-black"
    >

      {/* Üst bilgi metni */}
      <p className="absolute top-2 left-4 right-4 text-white/60 text-[14px] sm:text-[15px] font-light tracking-wide text-center leading-relaxed z-10 pointer-events-none">
        İsim, soyisim gibi kimlik bilgileri sorulmuyor. Seçtiğiniz en az altı cümle sizin karakterinizi tanımlıyor. Hissederek seçim yapın.
      </p>


      {/* Başlık / sayaç */}
      <div className="w-full px-4 flex justify-center shrink-0">
        {localSelectedIndices.length < 6 ? (
          <h1 className="text-red-500 text-2xl md:text-3xl font-bold uppercase animate-pulse text-center tracking-wider drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
            EN AZ 6 CÜMLE SEÇ
          </h1>
        ) : (
          <h1
            className="text-green-500 text-2xl md:text-3xl font-bold uppercase animate-pulse text-center tracking-wider drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] cursor-pointer"
            onClick={handleFinish}
          >
            BİTİRMEK İÇİN TIKLA
          </h1>
        )}
      </div>

      {/* Cümle gösterici */}
      <div className="flex flex-col items-center justify-center px-4 w-full">
        <div className="space-y-3 w-full flex flex-col items-center">
          <motion.p
            key={localCurrentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-[18px] sm:text-[20px] font-light leading-relaxed tracking-wide text-center transition-colors duration-500 ${

              localSelectedIndices.includes(localCurrentIndex)
                ? "text-[#25D366] drop-shadow-[0_0_10px_rgba(37,211,102,0.4)]"
                : "text-white"
            }`}
          >
            {localScript[localCurrentIndex]}
          </motion.p>
          {localSelectedIndices.includes(localCurrentIndex) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[#25D366] text-[13px] sm:text-[14px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 drop-shadow-[0_0_8px_rgba(37,211,102,0.4)] text-center"

            >
              <CheckCircle2 size={12} className="shrink-0" /> BU CÜMLEYİ SEÇTİNİZ
            </motion.div>
          )}
        </div>
      </div>

      {/* Kontrol paneli */}
      <div className="flex flex-col items-center gap-1 w-full px-4 shrink-0">
        {/* 2. Satır: Önceki, Numara, Sonraki */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 w-full max-w-md">
          {/* Önceki */}
          <div className="flex-1 flex justify-end">
            <button
              onClick={handlePrevious}
              className={`flex items-center gap-1 sm:gap-2 transition-all p-2 rounded-md hover:bg-white/5 active:scale-95 ${
                localCurrentIndex <= 0 ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              <ChevronLeft size={16} className="text-yellow-500 shrink-0" />
              <span className="text-[10px] sm:text-[10px] uppercase tracking-widest text-white/80">
                Önceki
              </span>
            </button>
          </div>

          {/* Numaratör */}
          <div className="flex flex-col items-center justify-center shrink-0 w-20">
            <span className="text-[10px] sm:text-[10px] uppercase tracking-[0.3em] text-white/40">
              Cümle
            </span>
            <div className="flex items-baseline gap-1 font-mono tracking-widest">
              <span className="text-base sm:text-lg font-bold text-yellow-500">
                {localCurrentIndex + 1}
              </span>
              <span className="text-[10px] sm:text-[10px] text-white/30">
                /{localScript.length}
              </span>
            </div>
          </div>

          {/* Sonraki */}
          <div className="flex-1 flex justify-start">
            <button
              onClick={handleNext}
              className={`flex items-center gap-1 sm:gap-2 transition-all p-2 rounded-md hover:bg-white/5 active:scale-95 ${
                localCurrentIndex >= localScript.length - 1 ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              <span className="text-[10px] sm:text-[10px] uppercase tracking-widest text-white/80">
                Sonraki
              </span>
              <ChevronRight size={16} className="text-yellow-500 shrink-0" />
            </button>
          </div>
        </div>

        {/* 3. Satır: İptal, Seçilen Sayacı, Seç */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 w-full max-w-md">
          {/* Sol Seçenek (Kırmızı İptal) */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative flex flex-col items-center">
              <button
                onClick={handleReject}
                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${
                  localRejectedIndices.includes(localCurrentIndex)
                    ? "bg-red-500/20 border border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    : "border border-white/30 text-white hover:text-white hover:border-white/50"
                }`}
              >
                <X size={20} />
              </button>
              {localRejectedIndices.includes(localCurrentIndex) && (
                <span className="absolute top-14 mt-1 text-[10px] whitespace-nowrap drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] pointer-events-none tracking-widest font-bold z-10">
                  🚫 👤 ❌
                </span>
              )}
              <span className="mt-2 text-[10px] text-white/50 tracking-[0.2em] font-light uppercase text-center">
                İptal
              </span>
            </div>
          </div>

          {/* Ortadaki Sayaç */}
          <div className="text-center flex flex-col items-center justify-center shrink-0 w-20">
            <div className="text-yellow-500/60 text-[9px] tracking-[0.3em] uppercase">
              SEÇİLEN
            </div>
            <div className="text-yellow-500 text-2xl font-mono font-bold tracking-[0.2em]">
              {localSelectedIndices.length}
            </div>
            <div className="text-[10px] tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              🔢 ✅
            </div>
          </div>

          {/* Sağ Seçenek (Yeşil Seç) */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative flex flex-col items-center">
              <button
                onClick={handleAccept}
                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${
                  localSelectedIndices.includes(localCurrentIndex)
                    ? "bg-[#25D366]/20 border border-[#25D366] text-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.4)]"
                    : "border border-yellow-500/60 text-yellow-500 hover:text-yellow-400 hover:border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                }`}
              >
                <Check size={24} />
              </button>
              {localSelectedIndices.includes(localCurrentIndex) && (
                <span className="absolute top-14 mt-1 text-[10px] whitespace-nowrap drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] pointer-events-none text-[#25D366] tracking-widest font-bold z-10">
                  🎯 ✅
                </span>
              )}
              <span className="mt-2 text-[9px] text-yellow-500/70 font-light tracking-[0.2em] uppercase text-center">
                Seç
              </span>
            </div>
          </div>
        </div>

        {/* Analiz Et butonu */}
        <button
          disabled={localSelectedIndices.length < 6}
          onClick={handleFinish}
          className="flex flex-col items-center gap-1 disabled:opacity-10 group mt-1"
        >
          <div className="w-10 h-10 rounded-full border border-yellow-500 flex items-center justify-center text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)] group-hover:bg-yellow-500 group-hover:text-black transition-all">
            <CheckCircle2 size={18} />
          </div>
          <span className="text-[8px] tracking-[0.5em] text-yellow-500 uppercase">
            ANALİZ ET
          </span>
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav onNavigate={onNavigate} />
    </motion.div>
    </>
  );
};

export default MisirSentence;


