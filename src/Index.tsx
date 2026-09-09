import React, { useEffect, useState } from "react";
import { getDailyMessageForDevice } from "./messageEngine";
import { HelpCircle, X, Share2 } from "lucide-react";
import { MESAJ_CUMLELERI } from "./data/nasilCumleleri";

// ============================================================
// İZOLE TEST SAYFASI (Index)
// - Tam ekran arka plan: public/duybeni-arkaplan.png
//   (contain: kartuşlu kenarlar dahil görselin TAMAMI görünür)
// - Ortalanmış GERÇEK günlük mesaj (generateDailyMessage)
// ============================================================

const Index: React.FC = () => {
  const [mesaj, setMesaj] = useState<string>("");
  const [showInfo, setShowInfo] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteInfo, setShowDeleteInfo] = useState(false);

  useEffect(() => {
    try {
      // Cihaza özel günlük mesaj: aynı gün aynı cihazda aynı,
      // farklı cihazlarda farklı mesaj (deviceId seed'e dahil).
      const testDate = localStorage.getItem("__testDate") || undefined;
      setMesaj(getDailyMessageForDevice(testDate));
    } catch (err) {
      setMesaj("Mesaj üretilemedi: " + (err as Error).message);
    }
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        backgroundColor: "#000",
        backgroundImage: "url('/duybeni-arkaplan.png')",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* ÜST LOGO - Nefertiti */}
      <img
        src="/nefertiti-q.webp"
        alt="Nefertiti"
        className="absolute top-[108px] left-1/2 -translate-x-1/2 z-[9997] w-[68px] sm:w-[84px] object-contain pointer-events-none"
      />

      {/* Ortalanmış gerçek günlük mesaj */}
      <div className="relative z-10 w-full max-w-[350px] max-h-[72%] flex flex-col items-center justify-center px-4">
        <p
          className="text-white text-sm sm:text-base leading-relaxed text-justify w-full whitespace-pre-line max-h-full overflow-y-auto scrollbar-hide py-2"
        >
          {mesaj || "Yükleniyor..."}
        </p>
      </div>

      {/* SOL ÜST SORU İŞARETİ — "Mesajlar nasıl üretiliyor" kısayolu */}
      <button
        onClick={() => setShowInfo(true)}
        aria-label="Mesajlar nasıl üretiliyor"
        className="absolute top-3 left-3 z-[9998] p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-amber-300 hover:border-amber-400/50 active:scale-95 transition-all cursor-pointer"
      >
        <HelpCircle size={20} />
      </button>

      {/* SAĞ ÜST PAYLAŞ */}
      <button
        onClick={() => setShowShare(true)}
        aria-label="Paylaş"
        className="absolute top-3 right-3 z-[9998] p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-amber-300 hover:border-amber-400/50 active:scale-95 transition-all cursor-pointer"
      >
        <Share2 size={18} />
      </button>

      {/* BİLGİ MODALI */}
      {showInfo && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
          onClick={() => setShowInfo(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-gradient-to-b from-amber-950 to-black border border-amber-500/30 rounded-xl p-5 shadow-2xl shadow-amber-900/40 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
              <h2 className="text-amber-300 text-sm font-medium tracking-wide">
                Mesajlar nasıl üretiliyor
              </h2>
              <button
                onClick={() => setShowInfo(false)}
                aria-label="Kapat"
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto scrollbar-hide pr-1">
              {MESAJ_CUMLELERI.map((cümle, idx) => (
                <p key={idx} className="text-white/90 text-[13px] leading-relaxed text-justify">
                  {cümle}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAYLAŞ MODALI */}
      {showShare && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
          onClick={() => { setShowShare(false); setShowDeleteInfo(false); }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-gradient-to-b from-amber-950 to-black border border-amber-500/30 rounded-xl p-5 shadow-2xl shadow-amber-900/40 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
              <h2 className="text-amber-300 text-sm font-medium tracking-[0.3em] uppercase">
                Paylaş
              </h2>
              <button
                onClick={() => { setShowShare(false); setShowDeleteInfo(false); }}
                aria-label="Kapat"
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto scrollbar-hide pr-1">
              {/* Paylaşım alanı (şimdilik placeholder — gerçek bağlantı ileride) */}
              <p className="text-white/90 text-[13px] leading-relaxed text-justify">
                Bu günün mesajını bir dostunla paylaşabilirsin.
              </p>
              <button
                onClick={() => console.log("PAYLAŞ — gerçek bağlantı henüz yok")}
                className="w-full py-2 rounded-lg border border-yellow-500/40 bg-yellow-600/20 text-amber-200 text-xs font-medium tracking-wider uppercase hover:bg-yellow-600/30 active:scale-[0.99] transition-all cursor-pointer"
              >
                Paylaş
              </button>

              {/* 1) Katkı daveti */}
              <p className="text-white/70 text-[13px] leading-relaxed text-justify mt-1">
                Yayılmasına katkıda bulunabilirsin.
              </p>

              {/* 2) MAAT ve SYNCRA kartları */}
              <div className="flex gap-3">
                <button
                  onClick={() => console.log("MAAT — bağlantı henüz yok")}
                  className="flex-1 py-3 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-900/30 to-black text-amber-200 text-sm font-semibold tracking-[0.3em] uppercase hover:border-amber-400/60 hover:from-amber-800/40 active:scale-[0.98] transition-all cursor-pointer"
                >
                  MAAT
                </button>
                <button
                  onClick={() => console.log("SYNCRA — bağlantı henüz yok")}
                  className="flex-1 py-3 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-900/30 to-black text-amber-200 text-sm font-semibold tracking-[0.3em] uppercase hover:border-amber-400/60 hover:from-amber-800/40 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Syncra
                </button>
              </div>

              {/* 3) Hesap silme */}
              {!showDeleteInfo ? (
                <button
                  onClick={() => setShowDeleteInfo(true)}
                  className="self-center text-white/35 hover:text-white/60 text-[10px] underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Hesabımı silmek istiyorum
                </button>
              ) : (
                <div className="bg-red-950/40 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-200/80 text-[11px] leading-relaxed text-center">
                    Hesap silme talebi için: destek@duybeni.com adresinden bize ulaşabilirsin.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
