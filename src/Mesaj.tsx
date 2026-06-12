import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { socratesData } from "./data/socrates";
import { konfucyusData } from "./data/konfucyus";
import { jungData } from "./data/jung";
import { unasData } from "./data/unas";
import { tematikHavuz } from "./data/tematikHavuz";

// ============================================================
// nefertitiData – 19 Nefertiti cümlesi (b01–b19)
// ============================================================
const nefertitiData: string[] = [
  "Ben Nil'in kızı, güneşin kızı Nefertiti. Oku, şimdi sana sesleniyorum.",
  "Ben tahtın sahibi, iki ülkenin hanımı Nefertiti. Oku, sana bir çağrım var.",
  "Ben Amarna'nın ışığı, piramitlerin sessiz tanığı Nefertiti. Oku, bugün sana ne fısıldayacağım.",
  "Ben kumların kalbi, Nil'in sesi Nefertiti. Oku, bu gün sana ne diyeceğim.",
  "Ben mavi tacın sahibi, iki ülkenin birleştiricisi Nefertiti. Oku.",
  "Ben güneş diskinin çocuğu, Akhenaton'un eşi Nefertiti. Oku, sana bir sır vereceğim.",
  "Ben doğanın dengesi, evrenin aynası Nefertiti. Oku, bugün sana ne söyleyeceğim.",
  "Ben iki diyarın koruyucusu, gölgelerin ötesi Nefertiti. Oku, bak bu gün ne diyeceğim.",
  "Ben hiyerogliflerin sırrı, okunmayan satır Nefertiti. Oku, büyük şeyler söyleyeceğim.",
  "Ben kum fırtınasının ortası, vahanın sessizliği Nefertiti. Oku, bu gün sana ne diyorum.",
  "Ben batmayan güneş, doğmayan ay Nefertiti. Oku, bugün sana fısıldıyorum.",
  "Ben iki diyarın köprüsü, çağların tanığı Nefertiti. Oku, şimdi sana dönüyorum.",
  "Ben papirüsün yaprağı, nilüferin açan çiçeği Nefertiti. Oku, zamanı geldi.",
  "Ben çölün rüzgarı, vahanın serinliği Nefertiti. Oku,",
  "Ben iki diyarın yazıcısı, kaderin kâtibi Nefertiti. Oku, bugün sana ne yazdım.",
  "Ben yıldızların dansı, gökyüzünün haritası Nefertiti. Oku, söyleyeceklerim önemli.",
  "Ben iki diyarın gülü, dikeni olmayan Nefertiti. Oku, şimdi sana konuşacağım.",
  "Ben doğumun ve ölümün döngüsü, sonsuzluğun kendisi Nefertiti. Oku, bu gün sana ne diyorum.",
  "Ben iki diyarın terazisi, kalpleri tartan Nefertiti. Oku, şimdi adalet vakti.",
];

// ============================================================
// hashCode – Bernstein Hash (deterministik)
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
// kantSüzgeci – Kant Mantık Süzgeci
// ============================================================
function kantSüzgeci(cümle: string): string {
  let temiz = cümle;
  temiz = temiz.replace(/^[\d\s\.\,\;\:\!\?\-\(\)\[\]\{\}""''""''""'']+/, "");
  temiz = temiz.replace(/\s{2,}/g, " ");
  temiz = temiz.trim();
  temiz = temiz.replace(/^[^a-zA-ZıİğĞüÜşŞöÖçÇ]+/, "").trim();
  if (temiz.split(" ").length < 2) {
    return cümle.replace(/^[^a-zA-ZıİğĞüÜşŞöÖçÇ]+/, "").trim();
  }
  return temiz;
}

// ============================================================
// localStorage yardımcıları – Günlük kullanım takibi
// ============================================================
function getRecentItems(): { ogutler: string[] } {
  const history: { date: string; ogut: string }[] = JSON.parse(
    localStorage.getItem("messageHistory") || "[]"
  );
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const filtered = history.filter(
    (entry) => new Date(entry.date) >= sevenDaysAgo
  );
  localStorage.setItem("messageHistory", JSON.stringify(filtered));
  return {
    ogutler: filtered.map((entry) => entry.ogut),
  };
}

const ogutler = [
  "Kendini olduğun gibi kabul et. Kusurların bile seni sen yapar.",
  "Sessizliğin içinde saklı olan cevabı duymayı öğren.",
  "Korkularının üzerine git. Onlar sandığından küçüktür.",
  "Affetmek, karşındakini değil, kendi ruhunu özgürleştirmektir.",
  "Küçük adımlar da olsa ilerlemek, durmaktan iyidir.",
  "Kendine karşı nazik ol. Çünkü sen evrenin bir parçasısın.",
  "Geçmişe takılıp kalma. Nil'in akışı gibi ileriye bak.",
  "Başkalarının ne dediğini değil, iç sesinin ne fısıldadığını dinle.",
  "Hata yapmaktan korkma. Her hata bir öğretmendir.",
  "Sevgiyi önce kendine ver. Ancak ondan sonra paylaşmaya başla.",
  "Her sabah yeniden doğarsın. Güneş gibi, umut gibi.",
  "Karanlıktan korkma. O olmadan yıldızları göremezsin.",
  "Bilmediğin şeylerden korkma. Onları keşfetmek için doğdun.",
  "Değişmekten korkma. Değişmeyen tek şey değişimin kendisidir.",
  "Her son yeni bir başlangıçtır. Kapanan kapıya takılıp kalma.",
  "Soru sormaktan korkma. Cehalet sorana değil, sormayana aittir.",
  "Gözlem yapmayı öğren. En büyük dersler sessizce verilir.",
  "Başkalarına yardım etmek istiyorsan, önce kendine yardım et.",
  "Kendi yolunu bul. Başkalarının izinden gitmek seni onlar kadar eder.",
  "Sadece ışığı değil, gölgeni de kucakla. İkisi de seni tamamlar."
];

// ============================================================
// generateDailyMessage – ESKİ SİSTEM + NEFERTITI + BENZETME
// ============================================================
export function generateDailyMessage(seed: number, testDate?: string) {
  // 1. Nefertiti başlığı seç (tarihe göre, her gün değişir)
  const todayStr = (testDate || new Date().toISOString().split("T")[0]).replace(/-/g, "");
  let baslikHash = 0;
  for (let i = 0; i < todayStr.length; i++) {
    baslikHash = ((baslikHash << 5) - baslikHash) + todayStr.charCodeAt(i);
    baslikHash |= 0;
  }
  const baslikIndex = Math.abs(baslikHash) % nefertitiData.length;
  const baslik = nefertitiData[baslikIndex];

  // 2. ogutler dizisinden bir öğüt seç (tekrar kontrolü ile)
  // Tarihe bağlı öğüt seçimi (her gün değişir)
  let ogutHash = 0;
  for (let i = 0; i < todayStr.length; i++) {
    ogutHash = ((ogutHash << 5) - ogutHash) + todayStr.charCodeAt(i);
    ogutHash |= 0;
  }
  let ogutIndex = Math.abs(ogutHash) % ogutler.length;
  const recentOgutler = getRecentItems().ogutler;
  let attempts = 0;
  while (recentOgutler.includes(ogutler[ogutIndex]) && attempts < ogutler.length) {
    ogutIndex = (ogutIndex + 1) % ogutler.length;
    attempts++;
  }
  let hamCümle = ogutler[ogutIndex];

  // 3. Kant süzgecinden geçir
  hamCümle = kantSüzgeci(hamCümle);

  // 4. Mesajı oluştur (başlıklı + tematik oda)
  const odalar = ["persona", "shadow", "noise", "flow"] as const;
  const odaIndex = Math.abs(seed) % odalar.length;
  const seciliOda: "persona" | "shadow" | "noise" | "flow" = odalar[odaIndex];
  const odaVerisi = tematikHavuz[seciliOda];

  // Son kullanılan eylem index'ini localStorage'dan al
  const lastKey = `last_${seciliOda}_action_index`;
  let actionIndex = parseInt(localStorage.getItem(lastKey) || "0", 10);
  actionIndex = (actionIndex + 1) % odaVerisi.actions.length;
  localStorage.setItem(lastKey, actionIndex.toString());

  // Aynı mantığı becourse ve touch için de yap (farklı anahtarlarla)
  const lastBecourseKey = `last_${seciliOda}_becourse_index`;
  let becourseIndex = parseInt(localStorage.getItem(lastBecourseKey) || "0", 10);
  becourseIndex = (becourseIndex + 1) % odaVerisi.becourses.length;
  localStorage.setItem(lastBecourseKey, becourseIndex.toString());

  const lastTouchKey = `last_${seciliOda}_touch_index`;
  let touchIndex = parseInt(localStorage.getItem(lastTouchKey) || "0", 10);
  touchIndex = (touchIndex + 1) % odaVerisi.touches.length;
  localStorage.setItem(lastTouchKey, touchIndex.toString());

  const eylem = odaVerisi.actions[actionIndex];
  const neden = odaVerisi.becourses[becourseIndex];
  const hatirlatma = odaVerisi.touches[touchIndex];

  const eylemMesaji = `\n\n✨ Bugünün eylemi:\n${eylem}\n\n${neden}\n\n${hatirlatma}`;

  const message = `${baslik} ${hamCümle}${eylemMesaji}`;

  // 5. Tekrar kontrolü için kaydet
  const today = new Date().toISOString().split("T")[0];
  let history = JSON.parse(localStorage.getItem("messageHistory") || "[]");
  const existingIndex = history.findIndex((entry: any) => entry.date === today);
  const newEntry = { date: today, ogut: hamCümle };

  if (existingIndex !== -1) {
    history[existingIndex] = newEntry;
  } else {
    history.push(newEntry);
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  history = history.filter((entry: any) => new Date(entry.date) >= sevenDaysAgo);
  localStorage.setItem("messageHistory", JSON.stringify(history));

  return { message: message };
}

// ============================================================
// Mesaj Component'i
// ============================================================
interface MesajProps {
  onNavigate: (view: string) => void;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
}

const Mesaj: React.FC<MesajProps> = ({ onNavigate, volume, onVolumeChange }) => {
  const [dailyMessage, setDailyMessage] = useState<{ message: string } | null>(null);
  const [dayPhase, setDayPhase] = useState<"init" | "waiting" | "reading" | "done">("init");
  const [geminiQuotaError, setGeminiQuotaError] = useState(false);
  const [shakeArmed, setShakeArmed] = useState(false);
  const [shakeTriggered, setShakeTriggered] = useState(false);
  const [showAlarmOverlay, setShowAlarmOverlay] = useState(false);
  const shakeLastRef = useRef({ x: 0, y: 0, z: 0, lastTime: 0 });

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

    let seedStr = "kadim";
    if (selected && selected.length > 0) {
      for (const idx of selected) {
        seedStr += "-s" + (idx + 1) * 7;
      }
    } else {
      seedStr += "-default";
    }
    if (rejected && rejected.length > 0) {
      for (const idx of rejected) {
        seedStr += "-r" + (idx + 1) * 13;
      }
    }
    seedStr += "-d" + today.replace(/-/g, "");
    const seed = hashCode(seedStr);

    const testDate = localStorage.getItem("__testDate") || undefined;
    const result = generateDailyMessage(seed, testDate);
    const msg = result.message;
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
              ? "Kadim bağ kuruluyor..."
              : "Kadim Kayıtlar Okunuyor..."}
          </p>
          {dayPhase === "reading" && (
            <p className="text-white/40 text-[9px] tracking-[0.3em] font-light animate-pulse mt-2">
              Kadim bağ kuruluyor...
            </p>
          )}
        </div>
      ) : (
        <div className="w-full max-w-[450px] flex-1 flex flex-col items-center justify-center pt-0 relative overflow-hidden pb-0">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src="/mesajalt.jpg"
              className="w-full h-full object-contain"
              alt="Çerçeve"
            />
          </div>
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
                  <p className="text-[16px] text-stone-300 leading-snug text-justify">
                    {dailyMessage.message}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      <div className="absolute top-0 left-0 right-0 w-full flex justify-center pt-2">
        <img
          src="/pisxaloi.png"
          alt="Test Bildirimi Gönder"
          onClick={() => {
            if ((window as any).__testNotification) {
              (window as any).__testNotification();
            }
          }}
          className="w-[60px] h-[60px] object-contain opacity-80 cursor-pointer active:scale-90 transition-transform duration-150 hover:opacity-100 hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:brightness-110"
        />
      </div>
      
    </motion.div>
  );
};

export default Mesaj;