import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { audioManager } from "./utils/audioManager";

// Amun Ra sayfasına ait sabit veriler
const AMUNRA_PAGE = {
  id: "amunra",
  name: "AMUN RA",
  image: "/83.png",
  text: `Seti konuşuyor. Evet, adımı ancak fısıltıyla almaya cesaret edebileceğiniz o Seti. Unutulmuş hanedanların en kudretlisi, 19. hanedanın hükümdarı. Seti. Sesimi duy. Ben, o sizin popüler kültürünüze kahraman yaptığınız koca kafalı II. Ramses'in babasıyım. Şimdi, Krallar Vadisi'nin en derin mezarının o havasız, tozlu, karanlığından doğruluyorum. Binlerce yıl süren o ağır, o dipdiri, o kâbus gibi uykudan uyanıyorum ve bakıyorum size. Sizin o aydınlık sandığınız, elektrikle aydınlatılmış, gürültülü fakat zihniyeti benden daha karanlık olan çağınıza bakıyorum. Siz bize "din" dersiniz, öyle değil mi? Bizi atalarınız olarak başınızın üzerinde taşıdığınızı sanırsınız. Ama aslında bizi bir kenara ittiniz. İlkel dediniz. Eski dediniz. Sonra elimizden düşürdüğümüz kırıntıları topladınız, üzerlerine biraz kendi düşüncenizden kattınız ve kendinize oyuncak kimlikler yaptınız.

Gülüyorum size. Ama nasıl bir gülüş bu bilir misiniz? İçinde hiç neşe olmayan. Sadece o derin, o ezici, insanın içine işleyen bir hayal kırıklığı var. Bir babanın, elinde oyuncaklarla oynarken görüp de utançtan gözlerini kaçırdığı evladına gülüşü gibi. Dinleyin beni, lütfen. Çünkü Abidos'un duvarlarına kazıdığım o sanatın, o eşsiz çizgilerin hatırına anlatıyorum. Amun başkadır. Ra başkadır. Sizin o modern ama bir o kadar da sığ zihniniz her şeyi bir kişi sanıyor, bir tanrı zannediyor. Amun da Ra da tanrı değildir. Sandığınız gibi değil. Biz taşlara yazarken hayal kurmuyor doğayı okuyorduk. Biz evrenin nabzını tutuyorduk. Ama onu anlatırken kullandığımız şey neydi? Havaydı, ama gördüğünüz hava değildi. Boşluktu, ama içinde yıldızların yuvarlandığı boşluk değildi. O, adını koyamadığınız titreşimlerdi. Varlığın özündeki o sarsılmaz, o dipsiz, o sonsuz sessizlikti.

Ra ise aşikâr olandır, ışıktır. Sizi ısıtan, gözünüzü kamaştıran — bir an bile yaşayamayacağınız o yakıcı, o kudretli enerjidir. Siz onu gökyüzünde bir disk zannettiniz. Bir adam, bir tanrı, bir hükümdar sandınız. Hayır. O bir mekanizmadır. Varoluşun motorudur. Evet zamanında halk kolay anlasın diye onları birleştirdik. Bir sembol yaptık. Bizim yaptığımız, gizli olanla görünür olanın o muazzam dansını — o kozmik düğümü — tek bir nefeste anlatmaktı. Siz bunu alıp bir çizgi film kahramanına isim yaptınız. Tanrı mı sandınız bizim yazdıklarımızı? Hayır. Onlar sıfattır, neticedir. "netcher" dedik biz ona. Siz bunu "tanrı" diye çevirdiniz. Ve çevirir çevirmez içini boşalttınız. Oysa "netcher" bir rütbedir, bir durumdur, bir oluş şeklidir. Siz duayla, büyüyle, ritüelle avunuyorsunuz. Biz ise onu, bir gerçeği işaretlerle ve sembollerle kodladık. Biz "Ra" dediğimizde fotonu kastediyorduk. "Amun" dediğimizde karanlık enerjiyi, görünmeyen olanı. Bunların hiçbiri bir kişi değildir. O, görünmez olanın (Amun) görünür olanla (Ra) yaptığı o muhteşem danstır. Yazık. Evet, yazık. Hem de öyle bir yazık ki, gözyaşlarınız Nil'i bile taşıyamaz. Size ey torunlarım, yazık.`
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

interface MisirAmunRaProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onSentenceNavigate?: (script: string[], indices: number[], rejected: number[], currentIdx: number) => void;
  onSpeakSentenceRef?: (fn: (index: number, script: string[], voiceType: string) => void) => void;
}

export default function MisirAmunRa({ onBack }: MisirAmunRaProps) {
  const sections = getTextSections(AMUNRA_PAGE.text, 3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
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

  const playPart = (part: 1 | 2 | 3) => {
    const audioMap: Record<number, string> = {
      1: "/amunra1.mp3",
      2: "/amunra2.mp3",
      3: "/amunra3.mp3",
    };

    cleanupAudio();
    setCurrentPart(part);

    const audio = audioManager.play(audioMap[part]) as HTMLAudioElement;
    audioRef.current = audio;

    const onEnded = () => {
      if (part < 3) {
        const nextPart = (part + 1) as 1 | 2 | 3;
        playPart(nextPart);
      } else {
        cleanupAudio();
        setIsPlaying(false);
        setCurrentPart(1);
      }
    };

    endedListenerRef.current = onEnded;
    audio.addEventListener("ended", onEnded);
    audio.play().catch((e) => {
      console.warn(`audio${part} play failed:`, e);
      setIsPlaying(false);
    });
  };

  const startPlayback = async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    await unlockAudio();
    setIsPlaying(true);
    playPart(1);
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
      key="amunra"
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
              src={AMUNRA_PAGE.image}
              alt={AMUNRA_PAGE.name}
              className="max-h-52 sm:max-h-56 w-auto object-contain rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            />
            <span className="mt-2 text-[10px] text-white/50 uppercase tracking-[0.35em]">
              {AMUNRA_PAGE.name}
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
                    ? currentPart === (idx + 1)
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
