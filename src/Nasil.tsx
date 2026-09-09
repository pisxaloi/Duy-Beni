import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { audioManager } from "./utils/audioManager";

// ===== Cümle listesi =====
const MESAJ_CUMLELERI = [
  "Mesajlar nasıl üretiliyor.",
  "Uygulama, günlük mesajlarını internet olmadan, tamamen telefonunuzun içinde üretiyor.",
  "Nasıl mı?",
  "Kullanıcı ilk kez uygulamaya girdiğinde birkaç cümle seçiyor.",
  "Bu cümleler onun kişisel profilini oluşturuyor.",
  "Günün tarihiyle birleşince her gün için eşsiz bir \"tohum\" ortaya çıkıyor.",
  "Sistemde on ana kategori var: iletişim, iç dünya, beden, dönüşüm, bakım, durgunluk, maneviyat, yaratıcılık, doğa ve ilişkiler.",
  "Mesajlar; eski Mısır yazıtları, kadim bilgelerin sözleri ve dünyanın dört bir yanından gelen öğretiler birleştirilerek hazırlanıyor.",
  "Son olarak mesajlar, herkesin kolayca anlayabileceği biçimde sadeleştiriliyor.",
  "Mesajlar tesadüflerle değil, determinizm yolu ile beş bin yıllık insanlık birikiminden elde edilen kıymetli sonuçlardır.",
  "Bazı mesajlarda küçük dil hataları olabilir; anlayışla karşıla.",
  "Onları hoş görün.",
  "Her gün gelen mesaj, kişisel profilinizin, tarihin, on kategorinin ve beş bin yıllık bilgeliğin birleşimiyle, tamamen size özeldir.",
];

// ===== Props tipi =====
interface NasilYapiyoruzProps {
  volume: number;
  onClose: () => void;
}

// ===== Bileşen =====
export default function NasilYapiyoruz({ volume, onClose }: NasilYapiyoruzProps) {
  const mesajAudioRef = useRef<HTMLAudioElement | null>(null);
  const mesajAudioEndedListenerRef = useRef<(() => void) | null>(null);
  const mesajAudioErrorListenerRef = useRef<((event: Event) => void) | null>(null);
  const mesajPlayVersionRef = useRef(0);
  const mesajTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mesajSegmentIndex, setMesajSegmentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (mesajAudioRef.current) {
      mesajAudioRef.current.volume = volume;
    }
  }, [volume]);

  // Play mesajlar.mp3 with timing-based sentence sync
  const playMesajAudio = () => {
    const playVersion = ++mesajPlayVersionRef.current;
    cleanupMesajAudio();

    if (mesajTimeoutRef.current) {
      clearTimeout(mesajTimeoutRef.current);
      mesajTimeoutRef.current = null;
    }

    setMesajSegmentIndex(0);
    setIsPlaying(true);

    // Ses dosyasını fetch ile önceden yükle (daha güvenilir)
    const loadAndPlay = async () => {
      try {
        const response = await fetch("/nasil.mp3");
        if (!response.ok) throw new Error("HTTP " + response.status);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (playVersion !== mesajPlayVersionRef.current) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        const audio = audioManager.play(blobUrl, { volume });
        mesajAudioRef.current = audio;

        // Sadece bu versiyon hala geçerliyse currentLocalAudio'ya ata
        if (playVersion === mesajPlayVersionRef.current && typeof window !== "undefined") {
          try {
            (window as any).currentLocalAudio = audio;
          } catch {}
        }

        let rafId: number;
        let isUnmounted = false;

        // Cümle bazlı timing hesapla
        const getTimings = (duration: number) => {
          const getWeight = (text: string) =>
            text.length + text.split(/[.,!?]/).length * 15;
          const weights = MESAJ_CUMLELERI.map((t) => getWeight(t));
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let cumulativeTime = 0;
          return weights.map((weight: number) => {
            const time = cumulativeTime;
            cumulativeTime += (weight / totalWeight) * duration;
            return time;
          });
        };

        const startPlayback = async () => {
          if (playVersion !== mesajPlayVersionRef.current) return;
          const timings = getTimings(audio.duration || 120); // fallback 120sn

          const checkTime = () => {
            if (isUnmounted || playVersion !== mesajPlayVersionRef.current) return;
            let newIndex = 0;
            for (let i = timings.length - 1; i >= 0; i--) {
              if (audio.currentTime >= timings[i]) {
                newIndex = i;
                break;
              }
            }
            setMesajSegmentIndex(newIndex);
            rafId = requestAnimationFrame(checkTime);
          };

          // Kısa bir gecikme ile çalmayı dene
          await new Promise(r => setTimeout(r, 50));
          
          // Versiyon hala geçerli mi kontrol et
          if (playVersion !== mesajPlayVersionRef.current) return;
          
          audio.play().catch((e: any) => {
            console.warn("mesajlar.mp3 play failed:", e);
            // Ses çalamazsak fallback timer'a geç
            cancelAnimationFrame(rafId);
            cleanupMesajAudio();
            startFallbackTimer(playVersion);
          });
          rafId = requestAnimationFrame(checkTime);
        };

        // loadedmetadata + canplay + hemen başlat (hangisi önce tetiklenirse)
        let started = false;
        const tryStart = () => {
          if (started) return;
          started = true;
          startPlayback();
        };

        audio.addEventListener("loadedmetadata", tryStart, { once: true });
        audio.addEventListener("canplay", tryStart, { once: true });

        // Güvenlik timeout: 3 saniye sonra metadata gelmezse yine de dene
        mesajTimeoutRef.current = setTimeout(() => {
          if (!started && audio) {
            tryStart();
          }
        }, 3000);

        audio.addEventListener("ended", () => {
          if (playVersion !== mesajPlayVersionRef.current) return;
          cancelAnimationFrame(rafId);
          cleanupMesajAudio();
          setMesajSegmentIndex(MESAJ_CUMLELERI.length); // "Tamamlandı" göster
          setIsPlaying(false);
        });

        audio.addEventListener("error", () => {
          if (playVersion !== mesajPlayVersionRef.current) return;
          cancelAnimationFrame(rafId);
          cleanupMesajAudio();
          // Seste hata olursa fallback timer ile devam et
          startFallbackTimer(playVersion);
        });

        // Temizlik fonksiyonu
        return () => {
          isUnmounted = true;
          cancelAnimationFrame(rafId);
          if (mesajTimeoutRef.current) {
            clearTimeout(mesajTimeoutRef.current);
            mesajTimeoutRef.current = null;
          }
        };
      } catch (err) {
        console.warn("mesajlar.mp3 fetch/load error, starting fallback timer:", err);
        // Ses dosyası yüklenemezse fallback timer ile cümleleri göster
        startFallbackTimer(playVersion);
      }
    };

    // Fallback: ses olmadan zamanlayıcı ile cümleleri sırayla göster
    const startFallbackTimer = (version: number) => {
      if (version !== mesajPlayVersionRef.current) return;
      let idx = 0;
      setMesajSegmentIndex(0);
      setIsPlaying(true);

      const advance = () => {
        if (version !== mesajPlayVersionRef.current) return;
        idx++;
        if (idx >= MESAJ_CUMLELERI.length) {
          setMesajSegmentIndex(MESAJ_CUMLELERI.length); // "Tamamlandı"
          setIsPlaying(false);
          return;
        }
        setMesajSegmentIndex(idx);
        // Her cümle için ortalama 3 saniye (cümle uzunluğuna göre)
        const cümle = MESAJ_CUMLELERI[idx];
        const süre = Math.max(2000, cümle.length * 80 + 1500);
        mesajTimeoutRef.current = setTimeout(advance, süre);
      };

      // İlk cümleden sonra 2.5sn bekle, sonra sırayla devam et
      mesajTimeoutRef.current = setTimeout(advance, 2500);
    };

    loadAndPlay();
  };

  const cleanupMesajAudio = () => {
    if (mesajTimeoutRef.current) {
      clearTimeout(mesajTimeoutRef.current);
      mesajTimeoutRef.current = null;
    }
    if (mesajAudioRef.current) {
      try {
        mesajAudioRef.current.pause();
        mesajAudioRef.current.src = "";
      } catch (e) {
        console.warn("cleanupMesajAudio error:", e);
      }
      mesajAudioRef.current = null;
    }
    if (typeof window !== "undefined") {
      try {
        (window as any).currentLocalAudio = null;
      } catch {}
    }
  };

  // Bileşen mount olunca otomatik oynat
  useEffect(() => {
    playMesajAudio();
    return () => {
      cleanupMesajAudio();
    };
  }, []);

  return (
    <>
      {/* Alt kısım - pisxaloi resmi (motion.div dışında) */}
      <div className="fixed bottom-[200px] left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">


        <img
          src="/pisxaloi.png"
          alt=""
          className="w-[50px] h-[50px] object-contain opacity-80"
        />
      </div>
    <motion.div
      key="mesaj"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex-1 flex flex-col justify-center items-center p-6 text-center overflow-y-auto h-full scrollbar-hide bg-black"

    >

      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-[200] p-2 group bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:border-yellow-500/50 active:scale-95 transition-all font-bold cursor-pointer"
      >
        <RotateCcw
          size={16}
          className="text-white group-hover:text-yellow-500 transition-colors"
        />
      </button>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center min-h-0 relative">

        {/* dikey.png - Sağ kenara yaslı */}
        <div className="absolute right-0 top-[-400px] bottom-0 w-14 md:w-16 flex items-center justify-center pointer-events-none z-10">
          <img
            src="/dikey.png"
            alt="Mesaj üretim şeması"
            className="w-full h-auto object-contain opacity-60 scale-90"
          />
        </div>

        {/* Cümle-cümle senkron gösterici */}
        <div className="w-full px-4 md:px-0 flex flex-col items-center justify-center flex-1 overflow-y-auto">
          {mesajSegmentIndex >= 0 && mesajSegmentIndex < MESAJ_CUMLELERI.length ? (
            <div className="w-full max-w-xl space-y-3">
              {MESAJ_CUMLELERI.map((cümle, idx) => {
                const isActive = idx === mesajSegmentIndex;
                const isPrev = idx === mesajSegmentIndex - 1;
                const isNext = idx === mesajSegmentIndex + 1;
                const isVisible = isActive || isPrev || isNext;
                if (!isVisible) return null;
                return (
                  <motion.p
                    key={idx}
                    initial={isActive ? { opacity: 0, y: 20 } : false}
                    animate={{
                      opacity: isActive ? 1 : 0.35,
                      y: 0,
                      scale: isActive ? 1 : 0.95,
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className={`leading-[1.6] text-justify transition-all duration-500 ${
                       isActive
                        ? "text-yellow-400 text-[14px] font-thin"
                        : "text-white/90 text-[14px] font-thin"
                    }`}
                  >
                    {cümle}
                  </motion.p>
                );
              })}
            </div>
          ) : mesajSegmentIndex === -1 ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-white/60 text-sm animate-pulse">
                Sesli metin hazırlanıyor...
              </p>
              <p className="text-white/30 text-[11px] max-w-md leading-relaxed">
                Bu bölümde mesajların nasıl üretildiğini adım adım göreceksiniz.
                Her cümle sesli olarak okunurken ekranda sırayla belirecek.
              </p>
            </div>
          ) : (
            <p className="text-white/40 text-sm">
              Tamamlandı ✓
            </p>
          )}
        </div>

        {/* İlerleme göstergesi */}
        <div className="text-center text-[10px] uppercase tracking-[0.3em] text-white/30 pt-4 pb-2">
          {mesajSegmentIndex >= 0 && mesajSegmentIndex < MESAJ_CUMLELERI.length
            ? `Cümle ${mesajSegmentIndex + 1} / ${MESAJ_CUMLELERI.length}`
            : mesajSegmentIndex === -1
              ? "Sesli metin hazırlanıyor..."
              : "Tamamlandı"}
         </div>
        </div>

      </motion.div>
    </>
  );
}



