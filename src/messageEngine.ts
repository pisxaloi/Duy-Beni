// ============================================================
// messageEngine – Günlük mesaj motoru (Mesaj.tsx UI'sinden ayrıştırıldı)
// - Nefertiti başlığı + öğüt + alıntı (Jung/Sokrates/Konfüçyus) + Unas + eylem
// - 7/14 gün tekrar önleme (localStorage)
// NOT: Bu dosya UI içermez; yalnızca mesaj üretim motorudur.
// ============================================================

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
export function hashCode(str: string): number {
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

// ============================================================
// Alıntı/Unas katmanı yardımcıları – 14 gün tekrar önleme
// ============================================================
interface QuoteHistoryEntry {
  date: string;
  jung?: string;
  socrates?: string;
  konfucyus?: string;
  unas?: string;
}

function getRecentQuotes(days: number): {
  jung: string[];
  socrates: string[];
  konfucyus: string[];
  unas: string[];
} {
  const history: QuoteHistoryEntry[] = JSON.parse(
    localStorage.getItem("quoteHistory") || "[]"
  );
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = history.filter((entry) => new Date(entry.date) >= cutoff);
  localStorage.setItem("quoteHistory", JSON.stringify(filtered));
  return {
    jung: filtered
      .map((entry) => entry.jung)
      .filter((c): c is string => !!c),
    socrates: filtered
      .map((entry) => entry.socrates)
      .filter((c): c is string => !!c),
    konfucyus: filtered
      .map((entry) => entry.konfucyus)
      .filter((c): c is string => !!c),
    unas: filtered
      .map((entry) => entry.unas)
      .filter((c): c is string => !!c),
  };
}

function pickCümle(
  pool: string[],
  poolAdı: string,
  sonKullanilanlar: string[],
  seed: number,
  todayStr: string
): string {
  const hashInput = `${seed}|${todayStr}|${poolAdı}`;
  const baslangicIndex = hashCode(hashInput) % pool.length;
  let index = baslangicIndex;
  let attempts = 0;
  while (sonKullanilanlar.includes(pool[index]) && attempts < pool.length) {
    index = (index + 1) % pool.length;
    attempts++;
  }
  return pool[index];
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
  // 1. Nefertiti başlığı + öğüt: tarih + cihaz kimliği (deviceId) birlikte hash'lenir.
  //    Böylece aynı gün farklı cihazlar baştan (giriş cümlesinden) farklı mesaj görür.
  const todayStr = (testDate || new Date().toISOString().split("T")[0]).replace(/-/g, "");
  const deviceId = getOrCreateDeviceId();

  const hashWithDevice = (input: string): number => {
    const kaynak = input + "|" + deviceId;
    let h = 0;
    for (let i = 0; i < kaynak.length; i++) {
      h = ((h << 5) - h) + kaynak.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };

  const baslikHash = hashWithDevice(todayStr);
  const baslikIndex = baslikHash % nefertitiData.length;
  const baslik = nefertitiData[baslikIndex];

  // 2. ogutler dizisinden bir öğüt seç (tekrar kontrolü ile)
  //    Seçim tarihe + cihaza bağlıdır; 7 gün tekrar önleme aynen korunur.
  const ogutHash = hashWithDevice(todayStr + "|ogut");
  let ogutIndex = ogutHash % ogutler.length;
  const recentOgutler = getRecentItems().ogutler;
  let attempts = 0;
  while (recentOgutler.includes(ogutler[ogutIndex]) && attempts < ogutler.length) {
    ogutIndex = (ogutIndex + 1) % ogutler.length;
    attempts++;
  }
  let hamCümle = ogutler[ogutIndex];

  // 3. Kant süzgecinden geçir
  hamCümle = kantSüzgeci(hamCümle);

  // 3.1 Alıntı katmanı (jung/socrates/konfucyus) + Unas katmanı – 14 gün tekrar önleme
  const recentQuotes = getRecentQuotes(14);
  const jungCümle = kantSüzgeci(pickCümle(jungData, "jung", recentQuotes.jung, seed, todayStr));
  const socratesCümle = kantSüzgeci(pickCümle(socratesData, "socrates", recentQuotes.socrates, seed, todayStr));
  const konfucyusCümle = kantSüzgeci(pickCümle(konfucyusData, "konfucyus", recentQuotes.konfucyus, seed, todayStr));
  const unasCümle = kantSüzgeci(pickCümle(unasData, "unas", recentQuotes.unas, seed, todayStr));

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

  const alintiParagraf = `${jungCümle} ${socratesCümle} ${konfucyusCümle}`;
  const message = `${baslik} ${hamCümle}\n\n${alintiParagraf}\n\n${unasCümle}${eylemMesaji}`;

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

  // 5.1 Alıntı + Unas seçimlerini 14 günlük geçmişe kaydet (tekrar önleme)
  let quoteHistory = JSON.parse(
    localStorage.getItem("quoteHistory") || "[]"
  ) as QuoteHistoryEntry[];
  const quoteExistingIndex = quoteHistory.findIndex((entry) => entry.date === today);
  const quoteEntry: QuoteHistoryEntry = {
    date: today,
    jung: jungCümle,
    socrates: socratesCümle,
    konfucyus: konfucyusCümle,
    unas: unasCümle,
  };
  if (quoteExistingIndex !== -1) {
    quoteHistory[quoteExistingIndex] = quoteEntry;
  } else {
    quoteHistory.push(quoteEntry);
  }
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  quoteHistory = quoteHistory.filter(
    (entry) => new Date(entry.date) >= fourteenDaysAgo
  );
  localStorage.setItem("quoteHistory", JSON.stringify(quoteHistory));

  return { message: message };
}

// ============================================================
// Cihaz kimliği (deviceId) + cihaza özel günlük mesaj
// - Aynı gün farklı cihazlar farklı mesaj görür,
//   aynı cihaz aynı gün aynı mesajı görmeye devam eder.
// - Kullanıcıya hiçbir soru sorulmaz; deviceId arka planda üretilir.
// ============================================================
const DEVICE_ID_KEY = "deviceId";
const DAILY_CACHE_PREFIX = "dailyMessage_";

export function getOrCreateDeviceId(): string {
  let existing: string | null = null;
  try {
    existing = localStorage.getItem(DEVICE_ID_KEY);
  } catch {}
  if (existing) return existing;

  let id = "";
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    }
  } catch {}
  if (!id) {
    id = "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }
  try {
    localStorage.setItem(DEVICE_ID_KEY, id);
  } catch {}
  return id;
}

export function buildDailySeed(testDate?: string): number {
  const today = (testDate || new Date().toISOString().split("T")[0]).replace(/-/g, "");

  let selected: number[] | undefined;
  let rejected: number[] | undefined;
  try {
    const s = localStorage.getItem("selectedIndices");
    const r = localStorage.getItem("rejectedIndices");
    if (s) selected = JSON.parse(s);
    if (r) rejected = JSON.parse(r);
  } catch {}

  let seedStr = "kadim";
  if (selected && selected.length > 0) {
    for (const idx of selected) seedStr += "-s" + (idx + 1) * 7;
  } else {
    seedStr += "-default";
  }
  if (rejected && rejected.length > 0) {
    for (const idx of rejected) seedStr += "-r" + (idx + 1) * 13;
  }
  seedStr += "-d" + today;
  // Cihaz kimliği seed'e dahil: aynı gün farklı cihazlar farklı seed üretir
  seedStr += "-dev" + getOrCreateDeviceId();
  return hashCode(seedStr);
}

export function getDailyMessageForDevice(testDate?: string): string {
  const today = testDate || new Date().toISOString().split("T")[0];
  const deviceId = getOrCreateDeviceId();
  const cacheKey = DAILY_CACHE_PREFIX + deviceId;

  // Aynı (cihaz + tarih) için daha önce üretilmiş mesaj varsa onu kullan
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.date === today && typeof parsed.message === "string" && parsed.message) {
        return parsed.message;
      }
    }
  } catch {}

  const message = generateDailyMessage(buildDailySeed(testDate), testDate).message;

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ date: today, message }));
  } catch {}
  return message;
}