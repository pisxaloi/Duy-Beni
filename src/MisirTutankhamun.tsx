import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { audioManager } from "./utils/audioManager";

// Tutankhamun sayfasına ait sabit veriler
const TUTANKHAMUN_PAGE = {
  id: "tutankhamun",
  name: "TUTANKHAMUN",
  image: "/82.png",
  text: `Ben Tutankhamun. Sarsılmaz gerçekliğinden sesleniyorum size. Ölümün sessizliğinden değil; kadim bir bilginin sarsılmaz gerçekliğinden sesleniyorum. Ben, sizin Tutankhamun dediğiniz kişiyim. Tarih kitaplarınızın 'çocuk kral' dediği. Aradan binlerce yıl geçti ve sözlerimin, eylemlerimin torunlarım tarafından nasıl birer masala dönüştürüldüğünü gördükçe büyük bir hayret içindeyim. Şaşkınım. Çünkü sizin Mısır uzmanı dediğiniz o adamlar, her şeyi bir hayal dünyasına, bir inanç karmaşasına sığdırmışlar. Bizim kutsal yazılarımızı birer ses yığınına dönüştürmüşler. Hiyeroglif dediğimiz o derin işaretleri sese çevirip, sonra o seslerden kafalarına göre tanrılar, kurbanlar ve mucizeler uydurmuşlar. Bakın, size gerçekten ne yaptığımı anlatayım. Ben ölmeden önce Mısır'da gördüğüm şey, din kavgası değildi. Bilginin çöküşüydü. İnsanlar, atalarımızın o muazzam kütüphanelerinden, piramitlerin altındaki derin yazılardan gelen gerçek bilgiyi unutmuşlardı. Toprak, gökyüzü ve yaşamla olan iletişim kopmuştu. Buğdayı yanlış zamanda ekiyorlardı. Nehir taştığında toprağa tohum bırakmıyorlardı. Mevsimlerin ritmini, toprağın frekansını duymaz olmuşlardı. Sonuç ne miydi? Hastalık ve kaos. Diktirdiğim o taşın üzerine bir kralın zaferini değil, bir mühendisin tamir planını kazıdım ben. O eski yazılara baktım. Piramitlerin altındaki o kadim kodları yeniden okudum. Halkıma, buğdayın ne zaman toprağa değmesi gerektiğini, suyun manyetik gücünü nasıl kullanacaklarını, bitkilerin hangi vakitlerde gökyüzüyle rezonansa girdiğini yeniden öğrettim. İşte o diktiğim taşa restorasyon steli adını taktınız. Yunanlılar başladı önce uydurmaya sonra siz devam ettiniz. Dağda oturan Zeus, Athena … Olmayan şeyleri varmış gibi anlattınız. Siz, 'Tanrıları mutlu etti' dediniz o yazdığım satırlar için. Oysa ben sese değil, öze bakın diyorum size. Ben. İki ülkenin koruyucusu olan o devasa çarkı yeniden çevirdim. Atalarımın derin kütüphanelerinde gizli olan o sarsılmaz yazıları ortaya çıkardım. Gördüm ki tohumun toprakla buluşma vakti şaşmış. Nehrin yükselişi ile insanın emeği arasındaki o kutsal bağ kopmuştu. İnsanlar bilgisizliğin karanlığında yanlış zamanda ekip, yanlış zamanda biçiyorlardı. Bu yüzden toprak küsmüş, sistem cevap vermez olmuştu. Ben o eski kodları yeniden canlandırdım. Bilgi evlerini ki sizler onlara tapınak diyorsunuz, en saf materyallerle yeniden kurdum. Gökyüzünden gelen o doğru zamanlama bilgisi yeryüzüne kesintisiz aksın diye. Tohumların ne zaman uyanacağını, suyun ne zaman çekileceğini taşa yeniden kazıdım. Sonra sistem yeniden cevap verdi. Ben kurban kesmedim. Yalan. Ben doğru bilgiyi, doğru zamanlamayı ve toprağın dilini yeniden insanlığa sundum. Bu yazılanlar benim imzamdır. Onları sese ve masallara boğup gerçeği görmemek sizin hakkınız değil. Restorasyon Steli gibi isimler vermek de hakkınız değil. O tanrı zannettiğiniz şeylerin her biri birer kavram. Düşünceleriniz ne kadar da sığlaşmış, kavramları isimleştirmekle kalmayıp bir de şahsileştirmişsiniz. Tam bir ilahi komedya. Kediden tanrı, çakaldan tanrı. Oysa asıl gerçek şudur: Ben size bir din değil, bir yaşam teknolojisi bıraktım. Ben, o çocuk kral, binlerce yıl öncesinden gerçeği söylüyorum. Biz doğaya tapmıyorduk. Biz doğayı bir yazılım gibi okuyorduk. Şimdi bu satırlara iyi bakın. Çünkü orada bir dinin törenleri değil, bir medeniyetin fabrika ayarları yazılıdır.`
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

interface MisirTutankhamunProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onSentenceNavigate?: (script: string[], indices: number[], rejected: number[], currentIdx: number) => void;
  onSpeakSentenceRef?: (fn: (index: number, script: string[], voiceType: string) => void) => void;
}

export default function MisirTutankhamun({ onBack }: MisirTutankhamunProps) {
  const sections = getTextSections(TUTANKHAMUN_PAGE.text, 4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3 | 4>(1);
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

  const playPart = (part: 1 | 2 | 3 | 4) => {
    const audioMap: Record<number, string> = {
      1: "/tutankhamun1.mp3",
      2: "/tutankhamun2.mp3",
      3: "/tutankhamun3.mp3",
      4: "/tutankhamun4.mp3",
    };

    cleanupAudio();
    setCurrentPart(part);

    const audio = audioManager.play(audioMap[part]) as HTMLAudioElement;
    audioRef.current = audio;

    const onEnded = () => {
      if (part < 4) {
        const nextPart = (part + 1) as 1 | 2 | 3 | 4;
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
      key="tutankhamun"
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
              src={TUTANKHAMUN_PAGE.image}
              alt={TUTANKHAMUN_PAGE.name}
              className="max-h-52 sm:max-h-56 w-auto object-contain rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.12)]"
            />
            <span className="mt-2 text-[10px] text-white/50 uppercase tracking-[0.35em]">
              {TUTANKHAMUN_PAGE.name}
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
