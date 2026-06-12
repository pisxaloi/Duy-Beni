import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { audioManager } from "./utils/audioManager";

interface MisirUnasProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onSentenceNavigate?: (script: string[], indices: number[], rejected: number[], currentIdx: number) => void;
  onSpeakSentenceRef?: (fn: (index: number, script: string[], voiceType: string) => void) => void;
}

const UNAS_PAGE = {
  id: "unas",
  name: "UNAS METİNLERİ",
  image: "/81.png",
  text: `Unas Piramidi. Çok anlamlıydı. Adınız binlerce yıl önceden görülüyordu. Şimdi okuyacağınız metinler, Mısır'daki Unas Piramidi'nin iç duvarlarında bulunan yazılardır. Ancak bu metinleri size alışılageldiği gibi sunmuyoruz. Önce şunu bilin: Bu metinlerin üzerine yüzyıllar boyunca pek çok anlam yazdınız. Arkeologların yorumları, Mısır mitolojisinin dinsel katmanları, akademinin 'böyle olmalı' diye dayattığı kalıplar. Bunların hepsini bir kenara bıraktık. Geride ne kaldı? Saf metin.Peki bu saf metin nedir? Rosetta Taşı sayesinde çözdüğünüz hiyerogliflerin anlamları... Sadece anlamları. Sesleri değil. Ritüel duaları değil. Hiçbir kabuğu değil. Sadece o sembollerin taşıdığı saf lojik ve kavramsal karşılıklar. Bu şekilde arındırılmış metinleri okuduğunuzda şaşırtıcı bir şey fark edeceksiniz: Bu metinler, tıpkı diğer kutsal metinlerin birbirine benzediği gibi, aynı evrensel sistemi anlatıyor. Bu, Mısır'a ait sıradan bir 'Ölüm Kitabı' değil. Bu, dünyanın nasıl çalıştığını, sistemlerin nasıl işlediğini, bilincin katmanlar arasında nasıl hareket ettiğini anlatan bir sistem mühendisliği dokümanı niteliğinde. Sanmayın ki biz 'eskiler' sizden çok gerideydik. Belki de yanılıyorsunuz. Bir düşünün. Aşağıda okuyacağınız 283 saf cümle, işte bu arındırma sürecinin sonucudur. Her biri bugünün diliyle anlamsız gelebilir. Fiil olmayabilir, özne olmayabilir. Ama kavramlar yan yana gelir ve bir cümle oluşturur. Bu cümlelerin ne anlattığını anlamak için onları sembolik bir sistem dili olarak okumalısınız. İşte o 'nas'ın size söyledikleri.`
};

const splitTextIntoSections = (text: string, sectionCount: number) => {
  const sentences = text
    .replace(/\r?\n/g, " ")
    .split(/(?<=[.?!])\s+/u)
    .filter(Boolean);

  if (sectionCount <= 1 || sentences.length <= sectionCount) {
    return [text.trim()];
  }

  const sections: string[][] = Array.from({ length: sectionCount }, () => []);
  sentences.forEach((sentence, index) => {
    const target = Math.min(
      sectionCount - 1,
      Math.floor((index / sentences.length) * sectionCount)
    );
    sections[target].push(sentence);
  });

  return sections.map((section) => section.join(" ").trim());
};

const getTextSections = (text: string, sectionCount: number) => {
  const sections = splitTextIntoSections(text, sectionCount);
  return sections.length ? sections : [text.trim()];
};

const MisirUnas: React.FC<MisirUnasProps> = ({ onBack, onNavigate }) => {
  const sections = getTextSections(UNAS_PAGE.text, 2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPart, setCurrentPart] = useState<1 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endedListenerRef = useRef<(() => void) | null>(null);
  const hasStartedRef = useRef(false);

  const cleanupAudio = () => {
    if (audioRef.current) {
      try {
        if (endedListenerRef.current) {
          audioRef.current.removeEventListener("ended", endedListenerRef.current);
        }
        audioRef.current.pause();
      } catch (e) {
        console.warn("cleanupAudio error:", e);
      }
      audioRef.current = null;
    }
    endedListenerRef.current = null;
  };

  const unlockAudio = async () => {
    try {
      const silentCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (silentCtx.state === "suspended") {
        await silentCtx.resume();
      }
      const silentOsc = silentCtx.createOscillator();
      const silentGain = silentCtx.createGain();
      silentGain.gain.value = 0.001;
      silentOsc.connect(silentGain);
      silentGain.connect(silentCtx.destination);
      silentOsc.start(0);
      silentOsc.stop(0.01);
    } catch (e) {
      console.warn("unlockAudio error:", e);
    }
  };

  const startPlayback = async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    cleanupAudio();
    await unlockAudio();
    setIsPlaying(true);
    setCurrentPart(1);

    const audio1 = audioManager.play("/unas1.mp3") as HTMLAudioElement;
    audioRef.current = audio1;

    const onPart1Ended = () => {
      cleanupAudio();
      setCurrentPart(2);

      const audio2 = audioManager.play("/unas2.mp3") as HTMLAudioElement;
      audioRef.current = audio2;

      const onPart2Ended = () => {
        cleanupAudio();
        setIsPlaying(false);
        setCurrentPart(1);
      };

      endedListenerRef.current = onPart2Ended;
      audio2.addEventListener("ended", onPart2Ended);
      audio2.play().catch((e) => {
        console.warn("audio2 play failed:", e);
        setIsPlaying(false);
        setCurrentPart(1);
      });
    };

    endedListenerRef.current = onPart1Ended;
    audio1.addEventListener("ended", onPart1Ended);
    audio1.play().catch((e) => {
      console.warn("audio1 play failed, needs interaction:", e);
      setIsPlaying(false);
    });
  };

  // Sayfa açılır açılmaz otomatik çal
  useEffect(() => {
    const timer = setTimeout(() => {
      startPlayback();
    }, 300);
    return () => {
      clearTimeout(timer);
      cleanupAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      key="unas"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col relative h-full overflow-hidden bg-black pb-28"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-[200] p-2 group bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:border-yellow-500/50 active:scale-95 transition-all font-bold cursor-pointer"
      >
        <RotateCcw
          size={16}
          className="text-white group-hover:text-yellow-500 transition-colors"
        />
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-row relative h-full w-full max-w-2xl mx-auto overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-start p-6 pr-16 pt-20 h-full text-center relative w-full overflow-y-auto scrollbar-hide">
          <div className="w-full mb-6 mt-4 flex flex-col items-center">
            <img
              src={UNAS_PAGE.image}
              alt={UNAS_PAGE.name}
              className="max-h-52 sm:max-h-56 w-auto object-contain rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            />
            <span className="mt-2 text-[10px] text-white/50 uppercase tracking-[0.35em]">
              {UNAS_PAGE.name}
            </span>
          </div>

          {/* Text panel */}
          <div className="w-full px-2 flex flex-col gap-4 text-white/90">
            {sections.map((section, idx) => (
              <p
                key={idx}
                style={{
                  fontSize: "11px",
                  lineHeight: "1.4",
                  textAlign: "justify",
                  margin: 0,
                  padding: 0,
                }}
                className={`font-light leading-relaxed text-justify transition-all duration-700 ${
                  isPlaying
                    ? (currentPart === 1 && idx === 0) || (currentPart === 2 && idx === 1)
                      ? "opacity-100 text-yellow-500/90"
                      : "opacity-40"
                    : "opacity-100"
                }`}
              >
                {section}
              </p>
            ))}
          </div>

          {/* 283 cümle linki - asıl sayfaya yönlendirir */}
          <div className="mt-6 pt-4 border-t border-white/10 w-full text-center">
            <span
              onClick={() => {
                if (onNavigate) onNavigate("unas");
              }}
              className="text-yellow-500/90 hover:text-yellow-400 underline decoration-yellow-600/40 hover:decoration-yellow-400/80 underline-offset-2 cursor-pointer transition-all duration-200 text-[12px] tracking-wider font-medium"
            >
              → O enteresan 283 cümle
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MisirUnas;
