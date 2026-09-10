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

// ============================================================
// Paylaşımda kullanılan test (beta) linki
// ============================================================
const TEST_LINK = "https://play.google.com/apps/testing/com.pisxaloi.duybeni";
const SYNCRA_PLAY_LINK = "https://play.google.com/store/apps/details?id=com.pisxaloi.syncra";
const MAAT_PLAY_LINK = "https://play.google.com/store/apps/details?id=com.maat.app";
const PAYLASIM_METNI =
  "Bugünün mesajı hoşuna gittiyse bir dostunla paylaş; uygulamayı beğendiysen yayılmasına katkı ver.";

// Bildirim test butonu: development modunda VEYA VITE_TEST_BILDIRIM=1 ile derlenirse görünür.
// (APK ile test için: $env:VITE_TEST_BILDIRIM="1"; npm run build)
const TEST_BILDIRIM_BUTONU =
  import.meta.env.DEV || import.meta.env.VITE_TEST_BILDIRIM === "1";

const Index: React.FC = () => {
  const [mesaj, setMesaj] = useState<string>("");
  const [showInfo, setShowInfo] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteInfo, setShowDeleteInfo] = useState(false);
  const [linkKopyalandi, setLinkKopyalandi] = useState(false);
  const [bildirimTestDurum, setBildirimTestDurum] = useState<string>("");

  // ============================================================
  // GEÇİCİ DEV ARACI — Bildirimi test et (yalnızca development modunda görünür)
  // App.tsx'teki 07:00 bildirimiyle aynı içerik, ama 10 saniye sonraya planlar.
  // Çakışmaması için farklı ID (9999) kullanır. Kalıcı özellik DEĞİLDİR.
  // ============================================================
  const bildirimTestEt = async () => {
    setBildirimTestDurum("Planlanıyor...");
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");

      const izin = await LocalNotifications.checkPermissions();
      if (izin.display !== "granted") {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== "granted") {
          setBildirimTestDurum("Bildirim izni verilmedi.");
          return;
        }
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9999,
            title: "Nefertiti",
            body: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
            largeBody: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
            summaryText: "Duy Beni",
            schedule: { at: new Date(Date.now() + 10000) },
            sound: "beep.wav",
            channelId: "duybeni_channel",
            extra: { url: "/?autoPlay=true" },
          },
        ],
      });
      setBildirimTestDurum("✅ 10 sn sonraya planlandı (id 9999).");
      setTimeout(() => setBildirimTestDurum(""), 4000);
    } catch (err) {
      setBildirimTestDurum("⚠️ Planlanamadı: " + (err as Error).message);
    }
  };

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
          text: PAYLASIM_METNI,
          url: TEST_LINK,
        });
        return;
      } catch {}
    }
    // 2) Yoksa/iptal edilirse: linki panoya kopyala
    await handleCopyTestLink();
  };

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

      {/* GEÇİCİ DEV ARACI — Bildirimi test et (dev modunda veya VITE_TEST_BILDIRIM=1 ile) */}
      {TEST_BILDIRIM_BUTONU && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[9998] flex flex-col items-center gap-1">
          <button
            onClick={bildirimTestEt}
            className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-amber-500/30 text-amber-300/80 text-[10px] tracking-wide hover:text-amber-200 hover:border-amber-400/60 active:scale-[0.97] transition-all cursor-pointer"
          >
            Bildirimi test et
          </button>
          {bildirimTestDurum && (
            <span className="text-amber-300/80 text-[10px] bg-black/60 rounded-full px-3 py-1">
              {bildirimTestDurum}
            </span>
          )}
        </div>
      )}

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
            <div className="flex flex-col gap-1 overflow-y-auto scrollbar-hide pr-1">
              {MESAJ_CUMLELERI.map((cümle, idx) => (
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
              {/* Paylaşım alanı */}
              <p className="text-white/90 text-[13px] leading-relaxed text-justify">
                Bugünün mesajı hoşuna gittiyse bir dostunla paylaş; uygulamayı beğendiysen yayılmasına katkı ver.
              </p>

              {/* Test (beta) linki — tıklanabilir + kopyalanabilir */}
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-black/40 p-3">
                <span className="text-amber-400/70 text-[10px] uppercase tracking-widest">
                  Test (beta) linki
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
                  {linkKopyalandi ? "Kopyalandı ✓" : "Test linkini kopyala"}
                </button>
              </div>

              <button
                onClick={handleShare}
                className="w-full py-2 rounded-lg border border-yellow-500/40 bg-yellow-600/20 text-amber-200 text-xs font-medium tracking-wider uppercase hover:bg-yellow-600/30 active:scale-[0.99] transition-all cursor-pointer"
              >
                Paylaş
              </button>

              {/* 1) Katkı daveti */}
              <p className="text-white/70 text-[13px] leading-relaxed text-justify mt-1">
                Yayılmasına katkıda bulunabilirsin.
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
                    Kadim Mısır sembolleriyle, içindeki mesajı adım adım çözmen için.
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
                    İçindeki soruya, I Ching'in kadim bilgeliğiyle sezgisel bir yön bulman için.
                  </span>
                </a>
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
