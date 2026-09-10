import React, { useEffect, useState } from "react";
import { getDailyMessageForDevice } from "./messageEngine";
import { HelpCircle, X, Share2 } from "lucide-react";
import { MESAJ_CUMLELERI } from "./data/nasilCumleleri";
import { MESAJ_CUMLELERI_EN } from "./data/nasilCumleleri.en";
import { MESAJ_CUMLELERI_DE } from "./data/nasilCumleleri.de";
import { MESAJ_CUMLELERI_ES } from "./data/nasilCumleleri.es";
import { MESAJ_CUMLELERI_PT } from "./data/nasilCumleleri.pt";
import { paylasimUI_TR, paylasimUI_EN, paylasimUI_DE, paylasimUI_ES, paylasimUI_PT } from "./paylasimUI";
import { bannerGizle, bannerGoster } from "./services/adsService";
import { useLanguage, SUPPORTED_LANGUAGES, type Language } from "./context/LanguageContext";

// ============================================================
// İZOLE TEST SAYFASI (Index)
// - Tam ekran arka plan: public/duybeni-arkaplan.png
//   (contain: kartuşlu kenarlar dahil görselin TAMAMI görünür)
// - Ortalanmış GERÇEK günlük mesaj (generateDailyMessage)
// ============================================================

// ============================================================
// Paylaşımda kullanılan test (beta) linki
// ============================================================
const TEST_LINK = "https://play.google.com/apps/testing/com.pisxaloi.duybeni";
const SYNCRA_PLAY_LINK = "https://play.google.com/store/apps/details?id=com.pisxaloi.syncra";
const MAAT_PLAY_LINK = "https://play.google.com/store/apps/details?id=com.maat.app";

const Index: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [mesaj, setMesaj] = useState<string>("");
  const [dilAcik, setDilAcik] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteInfo, setShowDeleteInfo] = useState(false);
  const [linkKopyalandi, setLinkKopyalandi] = useState(false);

  // Panoya kopyalama (clipboard API + eski tarayıcı fallback)
  const panoyaKopyala = async (metin: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(metin);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = metin;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyTestLink = async () => {
    const ok = await panoyaKopyala(TEST_LINK);
    if (ok) {
      setLinkKopyalandi(true);
      setTimeout(() => setLinkKopyalandi(false), 2500);
    }
  };

  const handleShare = async () => {
    // 1) Yerel paylaşım menüsü varsa: metin + link birlikte gönder
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Duy Beni",
          text: paylasimUI.metin,
          url: TEST_LINK,
        });
        return;
      } catch {}
    }
    // 2) Yoksa/iptal edilirse: linki panoya kopyala
    await handleCopyTestLink();
  };

  // Modal açıkken reklam banner'ını gizle, kapanınca geri getir (native'de anlamlı).
  useEffect(() => {
    if (showInfo || showShare) {
      bannerGizle();
    } else {
      bannerGoster();
    }
  }, [showInfo, showShare]);

  useEffect(() => {
    try {
      // Cihaza özel günlük mesaj: aynı gün aynı cihazda aynı,
      // farklı cihazlarda farklı mesaj (deviceId seed'e dahil).
      // lang: 'tr' / 'en' / 'de' / 'es' / 'pt' – dile göre veri havuzu ve arayüz metinleri seçilir.
      const testDate = localStorage.getItem("__testDate") || undefined;
      setMesaj(getDailyMessageForDevice(testDate, language));
    } catch (err) {
      setMesaj("Mesaj üretilemedi: " + (err as Error).message);
    }
  }, [language]);

  // PAYLAŞ modalı metinleri: dile göre (varsayılan TR)
  const paylasimUI =
    language === "en" ? paylasimUI_EN
      : language === "de" ? paylasimUI_DE
        : language === "es" ? paylasimUI_ES
          : language === "pt" ? paylasimUI_PT
            : paylasimUI_TR;

  // "?" bilgi modalı metinleri: dile göre TR / EN
  const bilgiCumleleri =
    language === "pt" ? MESAJ_CUMLELERI_PT : language === "es" ? MESAJ_CUMLELERI_ES : language === "de" ? MESAJ_CUMLELERI_DE : language === "en" ? MESAJ_CUMLELERI_EN : MESAJ_CUMLELERI;
  const bilgiBasligi =
    language === "pt" ? "Como suas mensagens são criadas"
      : language === "es" ? "Cómo se crean tus mensajes"
      : language === "de" ? "Wie deine Nachrichten entstehen"
      : language === "en" ? "How your messages are made"
        : "Mesajlar nasıl üretiliyor";

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
        <div className="w-full max-h-full overflow-y-auto scrollbar-hide py-1 flex flex-col gap-2">
          {mesaj
            ? mesaj
                .split(/\n{2,}/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((paragraf, i) => (
                  <p
                    key={i}
                    className="text-white text-sm sm:text-base leading-snug text-justify w-full whitespace-pre-line"
                  >
                    {paragraf}
                  </p>
                ))
            : <p className="text-white text-sm sm:text-base leading-snug text-justify w-full">Yükleniyor...</p>}
        </div>
      </div>

      {/* SOL ÜST SORU İŞARETİ — "Mesajlar nasıl üretiliyor" kısayolu */}
      <button
        onClick={() => setShowInfo(true)}
        aria-label="Mesajlar nasıl üretiliyor"
        className="absolute top-3 left-3 z-[9998] p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-amber-300 hover:border-amber-400/50 active:scale-95 transition-all cursor-pointer"
      >
        <HelpCircle size={20} />
      </button>

      {/* PAYLAŞ İKONU — "?" ikonunun yanında (sağ üstteki dil seçiciyle çakışmaz) */}
      <button
        onClick={() => setShowShare(true)}
        aria-label="Paylaş"
        className="absolute top-3 left-[52px] z-[9998] p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-amber-300 hover:border-amber-400/50 active:scale-95 transition-all cursor-pointer"
      >
        <Share2 size={18} />
      </button>

      {/* SAĞ ÜST: DİL SEÇİCİ (Syncra/MAAT ile birebir aynı görsel stil)
          Kapalıyken yalnızca aktif dilin kutusu görünür; hover/tık ile dikey sütun açılır. */}
      <div
        className="absolute top-4 right-4 z-[9999]"
        onMouseEnter={() => setDilAcik(true)}
        onMouseLeave={() => setDilAcik(false)}
        onClick={() => setDilAcik(!dilAcik)}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 0,
            fontSize: 0,
            background: dilAcik ? "rgba(255,255,255,0.92)" : "transparent",
            borderRadius: "0 0 8px 8px",
            boxShadow: dilAcik ? "0 4px 16px rgba(0,0,0,0.12)" : "none",
          }}
        >
          {(() => {
            const kodlar = SUPPORTED_LANGUAGES.map((l: Language) => ({
              key: l,
              label: l.toUpperCase(),
              alt: l === "tr" ? "Türkçe" : l === "en" ? "English" : l === "de" ? "Deutsch" : l === "es" ? "Español" : "Português",
              lang: l,
            }));
            const aktif = kodlar.find((k) => k.lang === language) ?? kodlar[0];
            const sirali = [aktif, ...kodlar.filter((k) => k.lang !== language)];
            return sirali.map((item, idx) => {
              if (!dilAcik && idx > 0) return null;
              return (
                <div
                  key={item.key}
                  title={item.alt}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLanguage(item.lang);
                    setDilAcik(false);
                  }}
                  style={{
                    cursor: "pointer",
                    width: 39,
                    height: 39,
                    userSelect: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: 0,
                    padding: 0,
                    border: 0,
                    borderRadius: 6,
                    opacity: item.lang === language ? 1 : 0.5,
                    background: "#bdbdbd",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    fontFamily: "sans-serif",
                    letterSpacing: "1px",
                  }}
                >
                  {item.label}
                </div>
              );
            });
          })()}
        </div>
      </div>

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
                {bilgiBasligi}
              </h2>
              <button
                onClick={() => setShowInfo(false)}
                aria-label="Kapat"
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto scrollbar-hide pr-1">
              {bilgiCumleleri.map((cümle, idx) => (
                <p key={idx} className="text-white/90 text-[12px] leading-tight text-justify">
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
                {paylasimUI.baslik}
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
              {/* Paylaşım alanı */}
              <p className="text-white/90 text-[13px] leading-relaxed text-justify">
                {paylasimUI.metin}
              </p>

              {/* Test (beta) linki — tıklanabilir + kopyalanabilir */}
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-black/40 p-3">
                <span className="text-amber-400/70 text-[10px] uppercase tracking-widest">
                  {paylasimUI.testLinkiEtiket}
                </span>
                <a
                  href={TEST_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300/90 text-[11px] leading-snug underline underline-offset-2 break-all hover:text-amber-200 transition-colors"
                >
                  {TEST_LINK}
                </a>
                <button
                  onClick={handleCopyTestLink}
                  className="self-start px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-900/20 text-amber-200/90 text-[10px] tracking-wide hover:bg-amber-800/30 active:scale-[0.97] transition-all cursor-pointer"
                >
                  {linkKopyalandi ? paylasimUI.kopyalandi : paylasimUI.kopyalaButon}
                </button>
              </div>

              <button
                onClick={handleShare}
                className="w-full py-2 rounded-lg border border-yellow-500/40 bg-yellow-600/20 text-amber-200 text-xs font-medium tracking-wider uppercase hover:bg-yellow-600/30 active:scale-[0.99] transition-all cursor-pointer"
              >
                {paylasimUI.paylasButon}
              </button>

              {/* 1) Katkı daveti */}
              <p className="text-white/70 text-[13px] leading-relaxed text-justify mt-1">
                {paylasimUI.katkiMetni}
              </p>

              {/* 2) MAAT ve SYNCRA kartları — logo + isim + açıklama + Google Play linki */}
              <div className="flex gap-3">
                <a
                  href={MAAT_PLAY_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-900/30 to-black p-3 text-center hover:border-amber-400/60 hover:from-amber-800/40 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <img
                    src="/maat-logo.png"
                    alt="MAAT"
                    className="w-12 h-12 rounded-xl object-contain"
                  />
                  <span className="text-amber-200 text-sm font-semibold tracking-[0.25em] uppercase">
                    MAAT
                  </span>
                  <span className="text-white/60 text-[10px] leading-snug">
                    {paylasimUI.maatAciklama}
                  </span>
                </a>
                <a
                  href={SYNCRA_PLAY_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-900/30 to-black p-3 text-center hover:border-amber-400/60 hover:from-amber-800/40 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <img
                    src="/syncra-logo.png"
                    alt="Syncra"
                    className="w-12 h-12 rounded-xl object-contain"
                  />
                  <span className="text-amber-200 text-sm font-semibold tracking-[0.25em] uppercase">
                    Syncra
                  </span>
                  <span className="text-white/60 text-[10px] leading-snug">
                    {paylasimUI.syncraAciklama}
                  </span>
                </a>
              </div>

              {/* 3) Hesap silme */}
              {!showDeleteInfo ? (
                <button
                  onClick={() => setShowDeleteInfo(true)}
                  className="self-center text-white/35 hover:text-white/60 text-[10px] underline underline-offset-2 transition-colors cursor-pointer"
                >
                  {paylasimUI.hesapSil}
                </button>
              ) : (
                <div className="bg-red-950/40 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-200/80 text-[11px] leading-relaxed text-center">
                    {paylasimUI.hesapSilBilgi}
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
