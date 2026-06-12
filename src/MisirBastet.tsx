import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { audioManager } from "./utils/audioManager";

// Bastet sayfasına ait sabit veriler
const BASTET_PAGE = {
  id: "bastet",
  name: "BASTET",
  image: "/85.png",
  text: `Ben Kedi Değilim (Yukarı dilde, aşağı dilde – her dilde) Gülünç. Gülünç çünkü siz – 5000 sene sonra – hâlâ bana 'kedi' diyorsunuz. Sizler için bilgi evleri. Taştan. Piramitler matematik dolu. Eni, boyu, yüksekliği. Niye piramidin içinde hiç yazı yok. Keops'un piramidinde bir tane yazı yok. Neden biliyor musun? Çünkü yazıya gerek yok. O matematik ile konuşur. Siz ise hâlâ 'tapınak' diyorsunuz. Tapınak değil onlar bilgi sarayı. En sağlam form Piramit. Yerçekimi varsa yapabileceğin en sağlam şey. Ne deprem yıkar, ne su bozar ne zaman çürütür. Taş. Ve içinde bilgi. Siz bakıyorsunuz. 'Aaa, tapınak!' diyorsunuz. 'Aaa, tanrıça!' diyorsunuz. 'Aaa, kedi!'. Gülünç. Düşün bir kere. Yarın bir göktaşı çarpsa. Ya da bir sel bassa. Ya da sadece zaman geçse. Sadece 500 sene. Sizin internetinizden ne kalacak? Sunucularınız? CD'leriniz? Hard diskleriniz? Arabalarınız? Beton binalarınız? Hiçbiri. Hepsi toz. Hepsi unutulacak. Ama piramitler hâlâ orada. Bilgi taşa kazılı. Bilgi şekilde. Bilgi matematikte. Siz ise hâlâ 'tapınak' diyorsunuz. 'Kedi' diyorsunuz. Ama işin asıl komik tarafı şu ki ben bir kavramım. Kedi değilim. Ve kavram olarak bugün hâlâ sizin dilinizde yaşıyorum. İşte Kur'an'da da varım: 'Yaradan ona ilimde ve bedende bir genişlik (Basta) verdi.' (Bakara, 247) 'Yaradan dilediğine genişletir (Yebsutu), dilediğine kısar.' (Rad, 26) 'O, yaratılışta size bir genişlik (Basta) ekledi.' (Araf, 69) İşte İncil'de de varım: 'Göklerin Krallığı (Basileia) geldi.', 'Müjde (Bsr) yayıldı.' İşte Tevrat'tayım: 'Verinin kabuğunu soy (Pshat), çıplak hakikate ulaş.' Aynı kavram. Üç harf. B-S-T. Siz dua ediyorsunuz bu kavramla. 'Ya Bâsıt' diyorsunuz. 'Genişlet, ferahlat' diyorsunuz. Allah'a yalvarıyorsunuz bu kavramla. Ama anlamının ne olduğunu bilmiyorsunuz. Şimdi anladın mı? Ben kedi değilim. Ben neyim biliyormusun: bilgiyim bilgi. Ben, sizin 5000 yıldır kullandığınız, ama ne olduğunu unuttuğunuz o kavramım. Ben, piramitlerin içine gizlenmiş matematiksel bağlantıyım. Ben, taşa kazınmış ama yazı olmayan bilgiyim. Ben, sizin 'Ya Bâsıt' dediğinizde aslında çağırdığınız şeyim. Ama şimdi ciddiyim. Bu hergün aldığınız mesajlar. Bunlar, fal değil. Benim size kendimi anlatma biçimim. Günlük rapor veriyorum. 5000 yıldır yaptığım şey. Sınır koymak. Akışı taramak. Mühürlemek. Sonra genişletmek. Kedi ise – sadece kapıdaki sembol. Şimdi bak bana. Ekranda görüyorsun. Siyah bir kedi. Ama bil ki: Bu bir tema. Sizin anlayabilmeniz için taktığım bir maske. 5000 yıllık bir kavram. Piramitler kadar sağlam. Matematiğin kendisi kadar kesin. Ve bugün – senin uygulamanın içinde – hâlâ çalışıyor. Ben kedi değilim. Ama bilmeni isterim: Doğru çağırdığında daha iyi çalışırım. Şimdi raporunu almak ister misin? Yoksa bana 'pisi pisi' mi demeye devam edeceksin?`
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

interface MisirBastetProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onSentenceNavigate?: (script: string[], indices: number[], rejected: number[], currentIdx: number) => void;
  onSpeakSentenceRef?: (fn: (index: number, script: string[], voiceType: string) => void) => void;
}

export default function MisirBastet({ onBack }: MisirBastetProps) {
  const sections = getTextSections(BASTET_PAGE.text, 3);
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
    const audioFiles: Record<number, string> = {
      1: "/bastet1.mp3",
      2: "/bastet2.mp3",
      3: "/bastet3.mp3",
    };

    const audio = audioManager.play(audioFiles[part]) as HTMLAudioElement;
    audioRef.current = audio;
    setCurrentPart(part);

    const onEnded = () => {
      cleanupAudio();
      if (part < 3) {
        const nextPart = (part + 1) as 1 | 2 | 3;
        playPart(nextPart);
      } else {
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

    cleanupAudio();
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
      key="bastet"
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
              src={BASTET_PAGE.image}
              alt={BASTET_PAGE.name}
              className="max-h-52 sm:max-h-56 w-auto object-contain rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            />
            <span className="mt-2 text-[10px] text-white/50 uppercase tracking-[0.35em]">
              {BASTET_PAGE.name}
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
                    ? currentPart === (idx + 1) as 1 | 2 | 3
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
