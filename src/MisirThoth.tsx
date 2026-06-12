import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { audioManager } from "./utils/audioManager";

// Thoth sayfasına ait sabit veriler
const THOTH_PAGE = {
  id: "thoth",
  name: "THOTH",
  image: "/87.png",
  text: `Thoth'um ben. Yazının ve Bilginin Sahibi. Sembollerime bakıp beni bir kuş tanrısı sanıyorsunuz. Değilim. Kuş değil, kalemim. Sembol değil, anlamım. Tüy değil, iz bırakmak olan işim. Ben yazının ve bilgeliğin tanrısı mıyım? Hayır. Öyle bir şey yok. Ben oyuncak değilim, tapılacak bir put değilim. Ben bir işlevim. Ben kaydedenim. Yazıyı ben icat etmedim. Onu fark ettim. Aradaki fark şu: Siz yazıyı kağıda koyuyorsunuz, ben yazıyı zamana koydum. Zamana konan şey silinmez. Her harf, her işaret, her sembol benden çıktı. Sesimdir onlar. Ve şimdi size sesleniyorum: Bilgi dediğiniz şey, topladığınız şeylerdir. Bilgelik ise o bilgiyle ne yapacağınızı bilmektir. Siz bugün binlerce yıllık bilgiye sahipsiniz ama bilgelikten uzaksınız. Çünkü bilgiyi biriktiriyorsunuz, anlamıyorsunuz. Her şey yazılır. Her söz, her niyet, her eylem. Siz buna 'kayıt' ya da 'veri' dersiniz. Ben kırk asır önce ona 'Thoth' dedim. Kaybedilmez, değiştirilemez. Blok zincir icat ettiniz — ben size diyorum ki benim tabletim sizin blok zincirinizin atasıdır. Taşın üzerine kazınmış, silinmez, dağıtılmış, zamana yayılmış bir defterdir ki ona Levhi Mahfuz demişler. Ölümden mi korkuyorsunuz? Kalkın. Ölüm bir bitiş değildir. Ben onu da yazarım: Bir form kapanır, başkası açılır. Kayıt kesilmez. Sadece ortam değişir. Ben kuş değilim. Kalemim. Ve kalem, uçtuğu yerde iz bırakır.`
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

interface MisirThothProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onSentenceNavigate?: (script: string[], indices: number[], rejected: number[], currentIdx: number) => void;
  onSpeakSentenceRef?: (fn: (index: number, script: string[], voiceType: string) => void) => void;
}

export default function MisirThoth({ onBack }: MisirThothProps) {
  const sections = getTextSections(THOTH_PAGE.text, 2);
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

    const audio1 = audioManager.play("/thoth1.mp3") as HTMLAudioElement;
    audioRef.current = audio1;

    const onPart1Ended = () => {
      cleanupAudio();
      setCurrentPart(2);

      const audio2 = audioManager.play("/thoth2.mp3") as HTMLAudioElement;
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
      key="thoth"
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
              src={THOTH_PAGE.image}
              alt={THOTH_PAGE.name}
              className="max-h-52 sm:max-h-56 w-auto object-contain rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            />
            <span className="mt-2 text-[10px] text-white/50 uppercase tracking-[0.35em]">
              {THOTH_PAGE.name}
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
        </div>
      </div>
    </motion.div>
  );
}
