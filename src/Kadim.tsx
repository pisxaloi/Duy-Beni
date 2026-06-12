import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import MisirNefertiti from "./MisirNefertiti";
import MisirBastet from "./MisirBastet";
import MisirAnubis from "./MisirAnubis";
import MisirThoth from "./MisirThoth";
import MisirNut from "./MisirNut";
import MisirAmunRa from "./MisirAmunRa";
import MisirTutankhamun from "./MisirTutankhamun";
import MisirUnas from "./MisirUnas";
import BottomNav from "./BottomNav";

interface MisirAncientProps {
  volume?: number;
  onBack: () => void;
  onNavigate?: (view: string) => void;
  onSentenceNavigate?: (script: string[], indices: number[], rejected: number[], currentIdx: number) => void;
  onSpeakSentenceRef?: (fn: (index: number, script: string[], voiceType: string) => void) => void;
}

const ROSETTA_SECTIONS = [
  "Rosetta Taşı'nın hikayesi. Rosetta Taşı İki yüz yıl önce bulundu. Taşı inceleyen Champollion, hiyerogliflere ses verdi. Dünya bunu alkışladı. Ve bu sesler üzerine kocaman bir Mısırbilim ve Tarih inşa edildi. Nedense kimse seslerin ardındaki anlama bakmadı. Biz bakıyoruz. Hiyerogliflerin anlamlarına bakıyoruz. Resim okuyoruz. Ve bu bakışla mesela Unas Piramidi'ndeki 283 cümlenin anlamı tamamen değişiyor. Bu bir ölüm metni değil. Bir yazılımın kaynak kodu.",
  "Ve bu gözle bakmaya devam edince her şey değişiyor: Tapınak denilen yerler aslında bilgi saraylarıdır. Bugünün kütüphaneleri gibi. Kuşaktan kuşağa bilgi aktaran, kalıcı hafıza merkezleri. Piramitler de öyle. Mezar değil. Bilgi işlem merkezleri. Bu bakış açısıyla Antik Mısır'a baktığınızda, tarihin yeniden yazılması gerektiğini görüyorsunuz. Seslere takılanlar mitoloji inşa etti. Biz anlamlarla işletim sistemi kuruyoruz. İstersen dene. Yandaki ikonlara bak. İçeri gir oku. Hayretler içinde kalacaksın. Ve bu büyük keşfi ilk duyanlardan biri olacaksın. Bir soru sor. Bir rüya bırak. Kadim bilgi saraylarından sana ne fısıldıyor, gör.",
];

// Tüm 8 karakter için sabit liste (sadece ikon bilgisi)
const ALL_PAGES = [
  { id: "nefertiti", name: "NEFERTITI", image: "/84.png" },
  { id: "bastet", name: "BASTET", image: "/85.png" },
  { id: "anubis", name: "ANUBIS", image: "/86.png" },
  { id: "thoth", name: "THOTH", image: "/87.png" },
  { id: "nut", name: "NUT", image: "/88.png" },
  { id: "amunra", name: "AMUN RA", image: "/81.png" },
  { id: "tutankhamun", name: "TUTANKHAMUN", image: "/82.png" },
  { id: "unas", name: "UNAS", image: "/83.png" },
];

const MisirAncient: React.FC<MisirAncientProps> = ({ onBack, onNavigate }) => {
  const [activeEgyptPageId, setActiveEgyptPageId] = useState<string | null>(null);
  const [activeRosettaSectionIndex, setActiveRosettaSectionIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ses otomatik başlatma - rosetta01 bittiğinde rosetta02'ye geç
  useEffect(() => {
    if (activeEgyptPageId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    if (audioRef.current) return;

    const audio = new Audio("/rosetta01.mp3");
    audio.loop = false;
    audio.volume = 0.5;
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      audioRef.current = null;
      setActiveRosettaSectionIndex(1);
    });

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const handleInteraction = () => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("touchstart", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        document.addEventListener("touchstart", handleInteraction);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [activeEgyptPageId]);

  // activeRosettaSectionIndex 1 olduğunda rosetta02'yi başlat
  useEffect(() => {
    if (activeEgyptPageId || activeRosettaSectionIndex !== 1 || audioRef.current) return;

    const audio = new Audio("/rosetta02.mp3");
    audio.loop = false;
    audio.volume = 0.5;
    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        const handleInteraction = () => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("touchstart", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        document.addEventListener("touchstart", handleInteraction);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [activeEgyptPageId, activeRosettaSectionIndex]);




  // Navigasyon öncesi alt sayfayı sıfırla ki BottomNav'dan Kadim'e dönüşte Rosetta ana ekranı görünsün
  const handleNavigateWithReset = useCallback((view: string) => {
    setActiveEgyptPageId(null);
    setActiveRosettaSectionIndex(0);
    onNavigate?.(view);
  }, [onNavigate]);

  const handleEgyptPageSelect = (pageId: string | null) => {
    if (!pageId) {
      setActiveEgyptPageId(null);
      setActiveRosettaSectionIndex(0);
      return;
    }

    setActiveEgyptPageId(pageId);
  };

  const renderSection = (section: string, idx: number) => {
    const diff = idx - activeRosettaSectionIndex;
    const isCurrent = diff === 0;
    const isNext = diff === 1;
    const isPast = diff < 0;

    if (diff > 1) {
      return null;
    }

    // Rosetta'nın ilk bölümünde "Unas Piramidi'ndeki 283 cümle" metnini link yap
    const isRosettaFirstSection = idx === 0;
    const linkPhrase = "Unas Piramidi'ndeki 283 cümle";

    const renderContent = () => {
      if (!isRosettaFirstSection) {
        return section;
      }

      // Metni link kısmından böl
      const linkIndex = section.indexOf(linkPhrase);
      if (linkIndex === -1) return section;

      const before = section.slice(0, linkIndex);
      const after = section.slice(linkIndex + linkPhrase.length);

      return (
        <>
          {before}
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleEgyptPageSelect("unas");
            }}
            className="text-yellow-500/90 hover:text-yellow-400 underline decoration-yellow-600/40 hover:decoration-yellow-400/80 underline-offset-2 cursor-pointer transition-all duration-200 font-medium"
          >
            {linkPhrase}
          </span>
          {after}
        </>
      );
    };

    return (
      <div key={idx}>

        <p
          style={{
            fontSize: "11px",
            lineHeight: "1.4",
            textAlign: "justify",
            margin: 0,
            padding: 0,
          }}
          className={`font-light leading-relaxed text-justify transition-all duration-700 ease-out ${
            isCurrent
              ? "opacity-100"
              : isNext
              ? "opacity-60 text-white/70"
              : "opacity-25 text-white/40"
          } ${isNext ? "translate-y-1" : ""}`}
        >
          {renderContent()}
        </p>
      </div>
    );

  };

  return (
    <motion.div
      key="egypt_ancient"
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

      {/* Split Responsive Container */}
      <div className="flex-1 flex flex-row relative h-full w-full max-w-2xl mx-auto overflow-hidden">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-start p-6 pr-16 pt-20 h-full text-center relative w-full overflow-y-auto scrollbar-hide">
          {/* 8 karakter sayfası yönlendirmesi */}
          {activeEgyptPageId === "nefertiti" && (
            <MisirNefertiti onBack={() => handleEgyptPageSelect(null)} />
          )}
          {activeEgyptPageId === "bastet" && (
            <MisirBastet onBack={() => handleEgyptPageSelect(null)} />
          )}
          {activeEgyptPageId === "anubis" && (
            <MisirAnubis onBack={() => handleEgyptPageSelect(null)} />
          )}
          {activeEgyptPageId === "thoth" && (
            <MisirThoth onBack={() => handleEgyptPageSelect(null)} />
          )}
          {activeEgyptPageId === "nut" && (
            <MisirNut onBack={() => handleEgyptPageSelect(null)} />
          )}
          {activeEgyptPageId === "amunra" && (
            <MisirAmunRa onBack={() => handleEgyptPageSelect(null)} />
          )}
          {activeEgyptPageId === "tutankhamun" && (
            <MisirTutankhamun onBack={() => handleEgyptPageSelect(null)} />
          )}
          {activeEgyptPageId === "unas" && (
            <MisirUnas onBack={() => handleEgyptPageSelect(null)} />
          )}

          {/* If no page selected, show Rosetta Stone */}
          {!activeEgyptPageId && (
            <>
              <div className="w-full mb-6 mt-4 flex flex-col items-center">
                <img
                  src="/roset.jpg"
                  alt="Rosetta Taşı"
                  className="max-h-52 sm:max-h-56 w-auto object-contain rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.12)]"
                />
                <span className="mt-2 text-[10px] text-white/50 uppercase tracking-[0.35em]">
                  Rosetta Taşı - Antik Mısır'ın anahtarı
                </span>
              </div>

              {/* Text panel */}
              <div className="w-full px-2 flex flex-col gap-4 text-white/90">
                {ROSETTA_SECTIONS.map((section, idx) => renderSection(section, idx))}
              </div>
            </>
          )}
        </div>

        {/* Floating Right Column for the 8 Icons */}
        <div className="absolute right-2 top-20 bottom-24 w-12 flex flex-col gap-2 flex-nowrap items-center justify-start py-2 overflow-y-auto scrollbar-hide z-[200]">
          {ALL_PAGES.map((page) => {
            const isActive = activeEgyptPageId === page.id;
            return (
              <button
                key={page.id}
                onClick={() => handleEgyptPageSelect(page.id)}
                className={`w-9 h-9 flex items-center justify-center rounded-md border backdrop-blur-md transition-all duration-300 relative group cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-yellow-500/20 border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.45)] scale-110"
                    : "bg-black/50 border-white/10 hover:border-yellow-500/50 hover:bg-zinc-900/40"
                }`}
              >
                <img
                  src={page.image}
                  alt={page.name}
                  className={`w-7 h-7 object-contain transition-transform duration-300 ${
                    isActive ? "scale-105" : "group-hover:scale-105 opacity-60 group-hover:opacity-100"
                  }`}
                />
                {/* Tooltip */}
                <div className="absolute right-full mr-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[9px] text-white tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                  {page.name}
                </div>
              </button>
            );
          })}

          {/* Reset Button (Back to Rosetta Stone) */}
          {activeEgyptPageId && (
            <button
              onClick={() => handleEgyptPageSelect(null)}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-neutral-700 bg-black/50 hover:bg-neutral-800 hover:border-yellow-500/50 text-white transition-all cursor-pointer group mt-2 shrink-0"
              title="Rosetta Giriş"
            >
              <RotateCcw size={14} className="text-white/60 group-hover:text-yellow-500 group-hover:rotate-180 transition-all duration-500" />
              <div className="absolute right-full mr-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-[9px] text-white tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                ROSETTA SEKANSI
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {onNavigate && <BottomNav onNavigate={handleNavigateWithReset} />}
    </motion.div>
  );
};

export default MisirAncient;
