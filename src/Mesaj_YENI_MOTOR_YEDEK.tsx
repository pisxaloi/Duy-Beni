import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

// ============================================================
// NEFERTITI_BASLIKLAR – 19 değişken başlık (b01..b19)
// ============================================================
const NEFERTITI_BASLIKLAR = [
  { id: "b01", number: 1, text: "Ben Nil'in kızı, güneşin kızı Nefertiti. Oku, şimdi sana sesleniyorum.", audio: "/b01.mp3" },
  { id: "b02", number: 2, text: "Ben tahtın sahibi, iki ülkenin hanımı Nefertiti. Oku, sana bir çağrım var.", audio: "/b02.mp3" },
  { id: "b03", number: 3, text: "Ben Amarna'nın ışığı, piramitlerin sessiz tanığı Nefertiti. Oku, bugün sana ne fısıldayacağım.", audio: "/b03.mp3" },
  { id: "b04", number: 4, text: "Ben kumların kalbi, Nil'in sesi Nefertiti. Oku, bu gün sana ne diyeceğim.", audio: "/b04.mp3" },
  { id: "b05", number: 5, text: "Ben mavi tacın sahibi, iki ülkenin birleştiricisi Nefertiti. Oku.", audio: "/b05.mp3" },
  { id: "b06", number: 6, text: "Ben güneş diskinin çocuğu, Akhenaton'un eşi Nefertiti. Oku, sana bir sır vereceğim.", audio: "/b06.mp3" },
  { id: "b07", number: 7, text: "Ben doğanın dengesi, evrenin aynası Nefertiti. Oku, bugün sana ne söyleyeceğim.", audio: "/b07.mp3" },
  { id: "b08", number: 8, text: "Ben iki diyarın koruyucusu, gölgelerin ötesi Nefertiti. Oku, bak bu gün ne diyeceğim.", audio: "/b08.mp3" },
  { id: "b09", number: 9, text: "Ben hiyerogliflerin sırrı, okunmayan satır Nefertiti. Oku, büyük şeyler söyleyeceğim.", audio: "/b09.mp3" },
  { id: "b10", number: 10, text: "Ben kum fırtınasının ortası, vahanın sessizliği Nefertiti. Oku, bu gün sana ne diyorum.", audio: "/b10.mp3" },
  { id: "b11", number: 11, text: "Ben batmayan güneş, doğmayan ay Nefertiti. Oku, bugün sana fısıldıyorum.", audio: "/b11.mp3" },
  { id: "b12", number: 12, text: "Ben iki diyarın köprüsü, çağların tanığı Nefertiti. Oku, şimdi sana dönüyorum.", audio: "/b12.mp3" },
  { id: "b13", number: 13, text: "Ben papirüsün yaprağı, nilüferin açan çiçeği Nefertiti. Oku, zamanı geldi.", audio: "/b13.mp3" },
  { id: "b14", number: 14, text: "Ben çölün rüzgarı, vahanın serinliği Nefertiti. Oku,", audio: "/b14.mp3" },
  { id: "b15", number: 15, text: "Ben iki diyarın yazıcısı, kaderin kâtibi Nefertiti. Oku, bugün sana ne yazdım.", audio: "/b15.mp3" },
  { id: "b16", number: 16, text: "Ben yıldızların dansı, gökyüzünün haritası Nefertiti. Oku, söyleyeceklerim önemli.", audio: "/b16.mp3" },
  { id: "b17", number: 17, text: "Ben iki diyarın gülü, dikeni olmayan Nefertiti. Oku, şimdi sana konuşacağım.", audio: "/b17.mp3" },
  { id: "b18", number: 18, text: "Ben doğumun ve ölümün döngüsü, sonsuzluğun kendisi Nefertiti. Oku, bu gün sana ne diyorum.", audio: "/b18.mp3" },
  { id: "b19", number: 19, text: "Ben iki diyarın terazisi, kalpleri tartan Nefertiti. Oku, şimdi adalet vakti.", audio: "/b19.mp3" },
];

// ============================================================
// hashCode – seed üretimi için
// ============================================================
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ============================================================
// generateDailyMessage – seed + tercih + .replace filtresi
// ============================================================
function generateDailyMessage(
  selectedIndices?: number[],
  rejectedIndices?: number[]
): string {
  const today = new Date().toISOString().split("T")[0];
  let seedStr = today;

  if (selectedIndices && selectedIndices.length > 0) {
    seedStr += "-" + selectedIndices.join(",");
  }
  if (rejectedIndices && rejectedIndices.length > 0) {
    seedStr += "-rej-" + rejectedIndices.join(",");
  }

  const seed = hashCode(seedStr);

  // Mesaj metnini üret
  const mesajHavuzu = [
    "İç sesini dinle. Her an bir fırsattır. Yolun açık olsun.",
    "Köklerine sıkı sarıl. Toprak ana seni besler. Sağlam temel her şeydir.",
    "Gökyüzü sınırsızdır. Hayallerin peşinden git. Umut en karanlık geceyi aydınlatır.",
    "Sevgi en büyük güçtür. Kalbinin sesini dinle. Şefkatle dokun hayata.",
    "Değişim kaçınılmazdır. Uyum sağlamak güçtür. Her dönüşüm bir arınmadır.",
    "Karanlıkta saklı gerçekler var. Gölgenle yüzleş. Bilinmeyen korkutucu ama özgürleştiricidir.",
    "Işık her zaman kazanır. Gerçeği görmek cesaret ister. Aydınlanma bir yolculuktur.",
    "Huzur içinde ol. Barış seninle başlar. Sakinlik en büyük erdemdir.",
    "Kaderine güven. Her şey bir sebeple olur. Teslimiyet bir zayıflık değildir.",
    "Özgürlük senin doğan. Kuralları sorgula. Bağımsızlık en büyük hazine.",
    "Her sır bir kapı açar. Bilinmeyenin peşinden git. Gizem seni çağırıyor.",
    "Gücünün farkına var. Mücadele seni şekillendiriyor. Cesaretin en büyük silahın.",
    "Derinlerde bir bilgelik yatıyor. Her soru bir cevap taşır. Bilmek, değişmektir.",
    "Dönüşüm kaçınılmazdır. Her son yeni bir başlangıçtır. Ölüm bile bir öğretmendir.",
    "Zaman akıp gidiyor. Her anı yaşa. Geçmiş ders, gelecek sürprizdir.",
    "Sessizlik en yüksek sestir. Dinle, duyacaksın. İçindeki fısıltıyı keşfet.",
    "Cesaret korkusuzluk değil, korkuya rağmen devam edebilmektir. Yoluna bak.",
    "Bazen kaybolmak, doğru yolu bulmanın tek yoludur. Kaybolmaktan korkma.",
    "Hayat bir nehir gibidir. Akışına direnme, bırak kendini. Seni nereye götüreceğini gör.",
    "Her insan bir evrendir. Kendi içinde sonsuzluk taşır. Keşfetmekten vazgeçme.",
  ];

  const mesajIndex = seed % mesajHavuzu.length;
  let message = mesajHavuzu[mesajIndex];

  // .replace filtresi – cümle başındaki gürültüyü temizle
  message = message.replace(/^[^a-zA-ZıİğĞüÜşŞöÖçÇ]+/, "").trim();

  return message;
}

// ============================================================
// getDailyTitle – günün başlığını seç (tarih + seed tabanlı)
// ============================================================
function getDailyTitle() {
  const today = new Date().toISOString().split("T")[0];
  let idx = 0;
  for (let i = 0; i < today.length; i++) {
    idx = (idx + today.charCodeAt(i) * (i + 1)) % NEFERTITI_BASLIKLAR.length;
  }
  return NEFERTITI_BASLIKLAR[idx];
}

// ============================================================
// Mesaj Component'i – Eski "index" view'ının aynısı
// ============================================================

interface MesajProps {
  onNavigate: (view: string) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

const Mesaj: React.FC<MesajProps> = ({ onNavigate, volume, onVolumeChange }) => {
  const [dailyMessage, setDailyMessage] = useState<{ message: string } | null>(null);
  const [dayPhase, setDayPhase] = useState<"init" | "waiting" | "reading" | "done">("init");
  const [geminiQuotaError, setGeminiQuotaError] = useState(false);
  const [shakeArmed, setShakeArmed] = useState(false);
  const [shakeTriggered, setShakeTriggered] = useState(false);
  const [showAlarmOverlay, setShowAlarmOverlay] = useState(false);
  const shakeLastRef = useRef({ x: 0, y: 0, z: 0, lastTime: 0 });

  const dailyTitle = getDailyTitle();

  // Mesajı yükle
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    try {
      const stored = localStorage.getItem("dailyMessage");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && parsed.message) {
          setDailyMessage({ message: parsed.message });
          setDayPhase("done");
          return;
        }
      }
    } catch {}

    let selected: number[] | undefined;
    let rejected: number[] | undefined;
    try {
      const s = localStorage.getItem("selectedIndices");
      const r = localStorage.getItem("rejectedIndices");
      if (s) selected = JSON.parse(s);
      if (r) rejected = JSON.parse(r);
    } catch {}

    setDayPhase("reading");
    const msg = generateDailyMessage(selected, rejected);
    setDailyMessage({ message: msg });
    setDayPhase("done");

    try {
      localStorage.setItem(
        "dailyMessage",
        JSON.stringify({ date: today, message: msg })
      );
    } catch {}
  }, []);

  return (
    <motion.div
      key="index"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col relative justify-start items-center p-3 pt-8 text-center overflow-hidden h-full min-h-0 bg-black"
    >
      {!dailyMessage || dayPhase !== "done" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-3">
          <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
          <p className="text-yellow-500 text-[10px] tracking-[0.5em] uppercase animate-pulse">
            {dayPhase === "waiting" || dayPhase === "reading"
              ? "Kadim bağ kuruluyor. Biraz sonra Nefertiti mesajı verecek..."
              : "Kadim Kayıtlar Okunuyor..."}
          </p>
          {dayPhase === "reading" && (
            <p className="text-white/40 text-[9px] tracking-[0.3em] font-light animate-pulse mt-2">
              {dailyTitle.text}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-[450px] flex-1 flex flex-col items-center justify-center pt-0 relative overflow-hidden pb-0">
          {/* Çerçeve resmi - tam görünür, arka planda */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src="/mesajalt.jpg"
              className="w-full h-full object-contain"
              alt="Çerçeve"
            />
          </div>

          {/* İçerik - çerçevenin üzerinde */}
          <div className="relative z-10 w-full px-3 sm:px-4 flex flex-col justify-start">
            <span className="text-stone-400 text-xs leading-snug text-center block pt-20">
              {new Intl.DateTimeFormat("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                weekday: "long",
              }).format((() => {
                const td = localStorage.getItem("__testDate");
                return td ? new Date(td + "T12:00:00") : new Date();
              })())}
            </span>
            <div className="flex flex-col items-center justify-center w-full shrink-0 pt-5">
              <h2 className="text-stone-400 text-[11px] leading-snug text-center px-6 font-light">
                {dailyTitle.text}
              </h2>
            </div>

            {geminiQuotaError && (
              <div className="w-full p-2 mb-3 text-center">
                <span className="text-[9px] text-yellow-400 font-semibold tracking-[0.05em] uppercase">
                  ⚠️ GEÇİCİ KAPASİTE YOĞUNLUĞU: Lokal çevrimdışı arşiv otomatik devreye alındı. Kesintisiz okumaya devam edebilirsin.
                </span>
              </div>
            )}

            {dailyMessage && dayPhase === "done" ? (
              <div className="relative min-h-0 w-full flex items-center justify-center">
                <div className="mt-3 w-full px-6">
                  <p className="text-[13px] text-stone-300 leading-snug text-justify">
                    {dailyMessage.message}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* En üst - pisxaloi resmi (buton olarak) */}
      <div className="absolute top-2 left-0 right-0 w-full flex justify-center z-40">
        <img
          src="/pisxaloi.png"
          alt="Test Bildirimi Gönder"
          onClick={() => {
            if ((window as any).__testNotification) {
              (window as any).__testNotification();
            }
          }}
          className="w-[80px] h-[80px] object-contain opacity-80 cursor-pointer active:scale-90 transition-transform duration-150 hover:opacity-100 hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:brightness-110"
        />
      </div>

      {/* Geçici BİLDİRİM TEST BUTONU - ekranın en altında */}
      <div className="absolute bottom-2 left-0 right-0 w-full flex justify-center z-50">
        <button
          onClick={async () => {
            try {
              // 1. LocalNotifications ile bildirim gönder (arka planda)
              if ((window as any).__testNotification) {
                await (window as any).__testNotification();
              } else {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                const baslik = dailyTitle?.text || "Nefertiti";
                await LocalNotifications.schedule({
                  notifications: [{
                    id: 9999,
                    title: baslik,
                    body: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
                    largeBody: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
                    summaryText: "Duy Beni",
                    schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
                    sound: undefined,
                    attachments: undefined,
                    actionTypeId: "",
                    extra: { url: "/?autoPlay=true" }
                  }]
                });
                console.log("✅ Test notification scheduled in 3 seconds with title:", baslik);
              }
              // 2. Shake sistemini silahlandır (bildirim alındı simülasyonu)
              setShakeArmed(true);
              setShakeTriggered(false);
              shakeLastRef.current = { x: 0, y: 0, z: 0, lastTime: 0 };
              console.log('📳 Shake system ARMED! Telefonu salla!');
              // 3. Doğrudan alarm overlay'ini göster (anında test)
              setTimeout(() => {
                setShowAlarmOverlay(true);
              }, 500);
            } catch (e) {
              console.warn("Test notification failed:", e);
              // Hata olsa bile alarm overlay'ini göster
              setShowAlarmOverlay(true);
            }
          }}
          className="px-4 py-1.5 bg-yellow-600/30 border border-yellow-500/50 rounded-full text-yellow-400 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-yellow-500/40 hover:border-yellow-400 active:scale-95 transition-all duration-200 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
        >
          🔔 BİLDİRİM TEST
        </button>
      </div>

      {/* Ses Barı - alt navigasyonun üstünde */}
      <div className="absolute bottom-[70px] left-0 right-0 w-full flex items-center justify-between px-4 py-1.5 bg-black/60 backdrop-blur-md border-t border-b border-white/5 z-30">
        <span className="text-[10px] text-white/50 tracking-widest uppercase mr-2">
          SES
        </span>
        <div className="flex-1 h-1.5 bg-zinc-900 rounded-full relative overflow-hidden group">
          <div
            className="absolute top-0 left-0 h-full bg-yellow-500"
            style={{ width: `${volume * 100}%` }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
        <span className="text-[9px] text-yellow-500 tracking-widest ml-2 w-6 text-right">
          {Math.round(volume * 100)}
        </span>
      </div>
    </motion.div>
  );
};

export default Mesaj;
