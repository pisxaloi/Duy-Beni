
// ZXC_CLEAN_CHECKPOINT_2026
import React, { useState, useRef, useEffect, useCallback } from "react";
import { audioManager } from "./utils/audioManager";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  X,
  Check,
  CheckCircle2,
  Heart,
  Sparkles,
  RotateCcw,
  Users,
  LogIn,
  Share2,
  Plus,
  Trash2,
  Phone,
  Send,
  MessageSquare,
  Copy,
  ArrowLeft,
  Moon,
  Cat,
  Sun,
  BookOpen,
  Eye,
  Crown,
  Leaf,
  Book,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bookmark,
} from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });


const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || "";
const DEEPSEEK_ENDPOINT = "/api/deepseek/v1/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

async function generateDeepSeekContent(payload: Record<string, unknown>) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key not configured. Set VITE_DEEPSEEK_API_KEY in your .env file.");
  }
  console.log("[DeepSeek Fetch] Sending request to", DEEPSEEK_ENDPOINT, "model:", payload.model);
  
  let response: Response;
  try {
    response = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (fetchError: any) {
    console.error("[DeepSeek Fetch] Network error:", fetchError);
    throw new Error(`DeepSeek network error: ${fetchError?.message || fetchError}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[DeepSeek Fetch] HTTP error:", response.status, errorText);
    throw new Error(`DeepSeek error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log("[DeepSeek Fetch] Response received, choices:", data?.choices?.length);
  return data;
}

/**
 * Gemini'den yanıt alınamazsa (kota/429) DeepSeek'e yedekleme yapar.
 * DeepSeek de başarısız olursa local fallback kullanılır.
 */
async function callAIWithFallback(
  geminiCall: () => Promise<any>,
  deepseekPayload: () => { systemPrompt: string; userMessage: string },
  skipGemini = false,
): Promise<Record<string, string>> {
  // Eğer skipGemini true ise (geminiQuotaError aktif), direkt DeepSeek'e geç
  if (skipGemini) {
    console.warn("[AI Fallback] Gemini atlanıyor (önceki kota hatası), direkt DeepSeek deneniyor...");
    return callDeepSeekOnly(deepseekPayload);
  }

  // Önce Gemini'yi dene
  try {
    const geminiResult = await geminiCall();
    return geminiResult;
  } catch (geminiError: any) {
    const errMsg = geminiError?.message || "";
    const errStr = JSON.stringify(geminiError) || "";
    const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") ||
                    errMsg.includes("429") ||
                    errStr.includes("RESOURCE_EXHAUSTED") ||
                    errStr.includes("429");

    if (!isQuota) {
      // Kota hatası değilse direkt fırlat
      throw geminiError;
    }

    console.warn("[AI Fallback] Gemini kota hatası, DeepSeek deneniyor...", geminiError);
    return callDeepSeekOnly(deepseekPayload);
  }
}

/**
 * Sadece DeepSeek'i dener, başarısız olursa hata fırlatır.
 */
async function callDeepSeekOnly(
  deepseekPayload: () => { systemPrompt: string; userMessage: string },
): Promise<Record<string, string>> {
  // DeepSeek API anahtarı yoksa local fallback'e geç
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API anahtarı yok, local fallback kullanılacak.");
  }

  try {
    const { systemPrompt, userMessage } = deepseekPayload();
    console.log("[DeepSeek] İstek gönderiliyor...");
    
    const dsResponse = await generateDeepSeekContent({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    console.log("[DeepSeek] Ham yanıt:", JSON.stringify(dsResponse).substring(0, 500));

    const content = dsResponse?.choices?.[0]?.message?.content || "";
    if (!content) {
      throw new Error("DeepSeek boş yanıt döndü");
    }

    console.log("[DeepSeek] İçerik:", content.substring(0, 300));

    let cleanContent = content;
    if (cleanContent.includes("```json")) {
      cleanContent = cleanContent.split("```json")[1].split("```")[0];
    } else if (cleanContent.includes("```")) {
      cleanContent = cleanContent.split("```")[1].split("```")[0];
    }

    const parsed = JSON.parse(cleanContent.trim());
    console.log("[AI Fallback] DeepSeek başarılı yanıt:", parsed);
    return parsed;
  } catch (dsError: any) {
    console.error("[AI Fallback] DeepSeek başarısız:", dsError);
    throw new Error("DeepSeek de başarısız oldu, local fallback kullanılacak.");
  }
}

// Delay and pacing helper to automatically retry upon 429 quota limits or space out rapid sequential requests
const callGeminiWithRetry = async <T,>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 2000
): Promise<T> => {
  let delay = initialDelay;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Gemini Retry] Quota limit/error caught. Delaying for ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff scaling
      } else {
        // Space out requests with custom pacing delay of 800ms
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      return await apiCall();
    } catch (error: any) {
      const errMsg = error?.message || "";
      const errStr = JSON.stringify(error) || "";
      const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") ||
                      errMsg.includes("429") ||
                      errStr.includes("RESOURCE_EXHAUSTED") ||
  errStr.includes("429");

      if (isQuota && attempt < maxRetries - 1) {
        // Hata alındığında hemen başa dönüp kilitlenmesin diye bilgisayarı 2 saniye dinlendiriyoruz
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }
  return apiCall();
};

const unasIntroTexts: string[] = [];

// === MESAJ ÜRETME ALGORİTMASI SABİTLERİ ===
// 16 kişilik persona cümle havuzu (personaPhrases)
const personaPhrases = [
  "Ben yıldızlardan geldim, göklere aitim.",
  "Sorgulanmayan hayat, yaşanmaya değmez.",
  "Korkularımla yüzleşir, içimdeki aslanı uyandırırım.",
  "Kurallar ve disiplin, ruhun kalesidir.",
  "Yaşadığım yer ve şartlar, benim kaderimdir.",
  "Asaletim sessizliğimde, gücüm duruşumdadır.",
  "Ödevim ve sorumluluğum, her arzudan üstündür.",
  "Eski benliğimi yaktım, küllerimden doğuyorum.",
  "Gerçeğin ışığı, geçici mutluluktan değerlidir.",
  "Rüyalarım, ruhumun bana gönderdiği mesajlardır.",
  "Birlik olanı ve kökü derinde olanı kimse yıkamaz.",
  "Mantık, karanlık yolları aydınlatan tek fenerdir.",
  "Geleneklere bağlılık, geleceğe atılan en sağlam adımdır.",
  "İçimdeki ilham, ortaya çıkacağı doğru anı bekler.",
  "Kendi müziğime göre dans eder, kalıplara sığmam.",
  "Her kararım, tüm dünya için bir yasa olmalıdır.",
];

// questionScript, personaPhrases ile aynıdır (geriye uyumluluk için)
const questionScript = personaPhrases;

/**
 * localStorage'dan selectedIndices ve keyword değerlerini okur.
 * Seed hesaplaması: selectedIndices toplamı + keyword karakter kodları + gün sayısı
 */
function getDeterministicSelection(): {
  seed: number;
  selectedIndices: number[];
  keyword: string;
} {
  let selectedIndices: number[] = [];
  let keyword = "";

  try {
    const stored = localStorage.getItem("selectedIndices");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        selectedIndices = parsed;
      }
    }
  } catch {
    selectedIndices = [];
  }

  try {
    const stored = localStorage.getItem("keyword");
    if (stored) {
      keyword = String(stored).trim();
    }
  } catch {
    keyword = "";
  }

  // Seed hesapla: selectedIndices toplamı + keyword karakter kodları + gün sayısı
  const indicesSum = selectedIndices.reduce((acc, val) => acc + val, 0);
  const keywordSum = keyword
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const daySinceEpoch = Math.floor(
    Date.now() / (1000 * 60 * 60 * 24)
  );

  // === GEÇİCİ TEST: Tarih offset'i ===
  // localStorage'daki testDateOffset değerini oku (yoksa 0)
  let testDateOffset = 0;
  try {
    const stored = localStorage.getItem("testDateOffset");
    if (stored) {
      testDateOffset = parseInt(stored, 10);
      if (isNaN(testDateOffset)) testDateOffset = 0;
    }
  } catch {
    testDateOffset = 0;
  }

  const seed = indicesSum + keywordSum + daySinceEpoch + testDateOffset;

  return { seed, selectedIndices, keyword };
}

/**
 * Deterministik seed kullanarak yerel (AI'siz) ilham mesajı üretir.
 * Gemini önerisiyle yenilendi: Önceden yazılmış 7 derin mesaj havuzu kullanır.
 */
function generateLocalMessage(
  seed: number,
  _unasTexts: string[],
  _jungTexts: string[],
  _skipCombinations: string[] = []
): {
  message: string;
} {
  // Gelişmiş seed'li rastgele sayı üreteci (deterministik)
  function seededRandom(s: number): () => number {
    let h = Math.abs(s) | 0;
    h = ((h ^ 0x9e3779b9) + (h << 6) + (h >> 2)) | 0;
    h = ((h ^ 0x85ebca6b) + (h << 3) + (h >> 5)) | 0;
    h = ((h ^ 0xc2b2ae35) + (h << 7) + (h >> 4)) | 0;
    let state = Math.abs(h) % 2147483647;
    if (state <= 0) state = 1;
    return () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
  }

  const rand = seededRandom(seed);

    // 4 Odalı Tematik Matris — her tema kendi actions/becourses/touches dizilerini barındırır
  const tematikHavuz: Record<string, { actions: string[]; becourses: string[]; touches: string[] }> = {
    persona: {
      actions: [
        "Gün içinde bir karar alırken ya da birine cevap verirken 3 saniye dur ve bekle.",
        "Haklı olduğundan %100 emin olduğun bir tartışmada, cümleni tam ortada kes ve sessiz kal.",
        "Birisiyle konuşurken onun kelimelerinden çok, beden diline ve sesinin altındaki gizli duyguya odaklan.",
        "Bugün aynaya baktığında sadece saçına veya kıyafetine değil, doğrudan kendi göz bebeklerinin içine 30 saniye boyunca kesintisiz bak.",
        "Bugün karşılaştığın ve normalde sıradan bulduğun bir canlıyı 1 dakika boyunca kıpırdamadan izle.",
        "Bugün seni eleştiren veya hakkında olumsuz konuşan birini duyduğunda savunmaya geçme, sadece dinle ve gülümse.",
        "Bugün birinden yardım istemen gereken bir durum oluştuğunda, gurur yapmadan net ve açık bir şekilde yardım talep et.",
        "Hayatında her zaman onayını almaya çalıştığın, seni kontrol eden bir figüre karşı bugün kendi net fikrini esnetmeden söyle.",
        "Bugün birinden aldığın bir eleştiriyi hemen reddetmek yerine, zihninde 'Acaba haklılık payı ne?' diyerek objektif olarak tart.",
        "Bugün birisiyle konuşurken onun personalarını izle ve onun aslında ne kadar incinebilir bir çocuk olduğunu fark et.",
        "Bugün birisinden bir talep veya istek geldiğinde, sırf ayıp olmasın diye evet demek yerine, içinden gelen o net 'Hayır'ı esnetmeden söyle.",
        "Bugün bir başkasının hatasını veya açığını yakaladığında, bunu yüzüne vurma dürtünü bilerek ez ve sessiz kal."
      ],
      becourses: [
        "Çünkü günlük hayatta takındığın maskeler (persona) bir süre sonra üzerine yapışır. Durduğunda, tepkini maskenin mi yoksa gerçek senin mi verdiğini fark edersin.",
        "Çünkü egon, haklı çıkmak ve kendini kanıtlamak için seni tüketir. Sustuğun an, enerjini dışarıya akıtmaktan kurtarır ve içindeki asıl gücü fark edersin.",
        "Çünkü insanlar kelimelerle personalarını (maskelerini) inşa ederler, ancak ses tonu ve beden dili bastırılan gölgeyi ele verir. Alt metni okumak gerçek iletişimi başlatır.",
        "Çünkü aynada gördüğün şey topluma sunduğun dış kabuktur (persona). Gözlerin içine derinlemesine bakmak, o kabuğun arkasındaki gözlemci bilinci uyandırır.",
        "Çünkü sürekli başkalarını memnun etmeye çalışmak, çocukluktan kalan bir hayatta kalma mekanizmasıdır. Sınır koyduğun an, bireyleşme sürecin (asıl benliğin) başlar.",
        "Çünkü savunma mekanizması, egonun kırılgan maskesini koruma çabasıdır. Haklı çıkmaya çalışmadığında, karşındakinin eleştirisinin seninle değil, tamamen onun iç dünyasıyla ilgili olduğunu görürsün.",
        "Çünkü her şeyi tek başına yapma çılgınlığı, egonun 'ben her şeye yeterim' diyen kibirli maskesidir. Yardım istemek zayıflık değil, sistemin ortak ağına güvenmektir.",
        "Çünkü ego, kendi hatasını görmemek için etrafına aşılmaz duvarlar örer. Duvarı indirdiğinde, dışarıdan gelen veriyi sistem optimizasyonu için kullanabilirsin.",
        "Çünkü insanların sert veya kibirli duruşları, içlerindeki korkmuş çocuğu korumak için ürettikleri yapay zırhlardır. Bunu gördüğünde içindeki saf şifa katmanı uyanır.",
        "Çünkü başkalarına zoraki verdiğin her evet, kendi öz benliğine (Self) attığın sarsıcı bir hayır tokadıdır. Sınır koymak, kendine olan saygındır.",
        "Çünkü başkalarının eksikliklerini ifşa etmek, egonun kendi kusurlarını gizlemek için kullandığı yapay bir üstünlük maskesidir."
      ],
      touches: [
        "Maske takanlar sadece rüya görür, içeriye bakanlar uyanır.",
        "Sessizlik, zayıflık değil; kontrolü tamamen ele almaktır.",
        "Kelimelerin arkasındaki sessizliği duymayı öğren.",
        "Gördüğün beden bir giysidir, asıl olan arkadaki bakıştır.",
        "Kendi sınırlarını çizmeyenler, başkalarının alanında köle olurlar.",
        "Sarsılmayan duruş, en büyük yanıttır.",
        "Birlik olanı ve kökü derinde olanı kimse yıkamaz.",
        "Gelişim, kendi zayıflığını veri olarak kabul etmekle başlar.",
        "Maskelerin arkasındaki çıplak insanı görmeyi öğren.",
        "Sınırlarını net çizmeyenler, başkalarının hayat senaryosunda figüran olurlar.",
        "Gerçek güç, başkalarının zayıflığını beslemeden kendi merkezinde kalabilmektir."
      ]
    },
    shadow: {
      actions: [
        "Uzun zamandır ertelediğin, seni huzursuz eden o zorlu görevi sabah ilk iş olarak tamamla.",
        "Birisi hakkında içinde büyüyen o sert eleştiriyi veya yargıyı fark ettiğin an dur.",
        "Son zamanlarda seni öfkelendiren bir olayı düşün ve sorumluluğun tamamen karşındakinde olduğu iddiasını bir kenara bırak.",
        "Gün içinde zihninde 'keşke' ile başlayan bir pişmanlık cümlesi yakaladığın an o cümleyi sustur.",
        "Gün içinde içinden birine karşı yoğun bir kıskançlık veya haset duygusu yükseldiğini fark ettiğin an dur ve o duyguya odaklan.",
        "Bugün geçmişte sana büyük haksızlık yapmış birini düşün ve içindeki o intikam/öfke senaryolarını çalıştırmayı bilerek reddet.",
        "Gün içinde içinden yükselen 'Ben her şeyi biliyorum' ya da 'Bu konuda en iyisi benim' hissini yakala ve o kibri bilerek ez.",
        "Bugün zihninde geçmişten gelen bir intikam veya hesaplaşma sahnesi başladığı an, o sahneyi tam ortasında dondur ve tamamen sil.",
        "Öfkelendiğinde dur ve kendine sor: 'Bu öfke bana ne söylüyor?'",
        "Bugün biriyle konuşurken içinden yükselen 'kendimi acındırma' veya 'ne kadar zorlandığımı anlatma' isteğini fark et ve o cümleyi hemen iptal et.",
        "Gün içinde içinden birine sertçe eleştirmek geçtiğinde, o eleştirinin kendi hayatındaki hangi eksikliği kapattığını bul."
      ],
      becourses: [
        "Çünkü gölgen (baskıladığın korkuların), sen kaçtıkça arkanda büyüyen bir gürültüye dönüşür. Üzerine gittiğinde o gölgenin aslında sadece bir illüzyon olduğunu görürsün.",
        "Çünkü başkalarında en çok rahatsız olduğun şeyler, aslında kendi içinde kabullenemediğin ve bastırdığın gölge taraflarının dışarıya yansımasıdır.",
        "Çünkü mağdur rolüne sığınmak, kendi içsel gücünü dış dünyaya teslim etmektir. Olaydaki kendi payını (bunu seçme nedenini) gördüğün an sistem özgürleşir.",
        "Çünkü pişmanlık, geçmişteki işlemci hatalarını bugünün enerjisini harcayarak yeniden çalıştırma hatasıdır. Geçmiş değiştirilemez, sadece analiz edilip veri alınır.",
        "Çünkü haset, karşındakinin başarılarından değil; kendi içinde bastırdığın, henüz gerçekleştiremediğin potansiyelinin (gölgenin) sana fırlattığı sarsıcı bir uyarıdır.",
        "Çünkü geçmişteki birine öfke duymak, bugünkü enerjini ona bedava kiralamaktır. Affetmek, karşındakini aklamak değil; kendi işlemcini o yükten kurtarmaktır.",
        "Çünkü bildiğini sanmak, sisteme yeni veri girişini tamamen kapatan en büyük hatadır. Cehaletini kabul ettiğin an bilgelik protokolü çalışır.",
        "Çünkü geçmişten gelen hesaplaşmalarla bugünün enerjisini harcayarak savaşmak, işlemciyi boş bir döngüde (infinite loop) kilitleyip tüketmektir.",
        "Çünkü öfke, çoğu zaman incinmiş egonun sesidir. Ama altında korku, hayal kırıklığı ya da çaresizlik yatar. Öfkeye tepki vermek yerine onu anlamak, gölgeni aydınlatır.",
        "Çünkü mağdur rolü oynamak, egonun çevreden sahte bir şefkat ve enerji emme taktiğidir. Bu kaçışı kestiğinde içindeki sarsılmaz irade uyanır.",
        "Çünkü dışarıya fırlattığın her sert yargı, aslında kendi iç dünyanda çözemediğin bir yaranın üzerine yapıştırdığın yapay bir maskedir."
      ],
      touches: [
        "Ertelediğin her şey, enerjini arkadan emen bir kaçaktır.",
        "Karşındaki insan bir düşman değil, sana seni gösteren bir aynadır.",
        "Kader, senin henüz bilincine çıkaramadığın seçimlerinin toplamıdır.",
        "Geçmişin hayaletleri, sadece sen enerji verdiğinde yaşar.",
        "Kıskandığın her insan, senin henüz yürüyemediğin potansiyelini gösterir.",
        "Geleceğe atılan en sağlam adım, geçmişin yüklerini lokalde bırakmaktır.",
        "En büyük veri, henüz hiçbir şey bilmediğini kabul ettiğin an gelir.",
        "Geçmişin borçlarını tahsil etmeye çalışmayı bırak, bugünün verisine odaklan.",
        "Öfke bir mesajdır, silah değil.",
        "Kendi gücünü, başkalarının acıma duygularına kurban etme.",
        "Başkalarını yargılamak, kendini tanımaktan kaçmaktır."
      ]
    },
    noise: {
      actions: [
        "Telefonunu 1 saatliğine sessize al ve odanın tamamen dışında bırak.",
        "Günlük rutininde her zaman yaptığın bir davranışı tamamen değiştir.",
        "Bir fincan çay ya da kahve içerken gözlerini kapat ve hiçbir şeye dokunmadan sadece tadı hisset.",
        "Yürürken etrafındaki nesnelerin sadece renklerine ve dokularına odaklan, zihninin onlara isim takmasını engelle.",
        "Evinde veya masanda uzun zamandır biriken, kullanmadığın ve sana eskiyi hatırlatan 3 nesneyi tamamen hayatından çıkar.",
        "İçinde bir şeyleri satın alma veya tüketme arzusu yükseldiğinde, o harcamayı 24 saat boyunca ertele.",
        "Bir işi yaparken içinden yükselen 'hızlı olmalıyım' baskısını fark et ve eyleminin hızını kasıtlı olarak yarıya indir.",
        "Bugün internette karşına çıkan, seni provoke eden veya tartışmaya çeken bir içeriğe kasıtlı olarak yorum yazma ve sayfayı kapat.",
        "Bugün yediğin yemeğin ilk lokmasını en az 30 kez çiğnemeden yutma ve çiğnerken sadece o besinin dokusuna odaklan.",
        "Bugün çalışma masanda veya odanda duran, dağınık olan tek bir köşeyi veya çekmeceyi milimetrik bir düzenle organize et.",
        "Gün içinde içinden yükselen 'bunu hemen yapmalıyım, yoksa geç kalacağım' paniğini yakala ve eylemini bilerek durdur.",
        "Akşam saatlerinde odandaki ışıkları kapat, sadece loş bir aydınlatma bırak ve 15 dakika boyunca sessizce otur.",
        "Bugün bir işi yaparken içinden yükselen 'her şey mükemmel olmalı' baskısını fark et ve o işi bilerek %80 kalitede bırak.",
        "Bugün karşılaştığın bir zorluk karşısında hemen şikayet etme dürtünü yakala ve ağzından çıkacak o cümleyi yut.",
        "Bugün evinde veya iş yerinde en çok vakit geçirdiğin odanın pencerelerini aç ve en az 5 dakika boyunca sadece dışarıdaki rüzgarın sesini dinle.",
        "Bugün canını sıkan veya seni daraltan bir düşünce yakaladığında, o düşünceyi kağıda yaz ve sonra o kağıdı gözlerinin önünde tamamen yak.",
        "Bir saat boyunca hiçbir ekrana bakma. Kitap oku, yürü ya da sadece otur.",
        "Bugün bir şeyi bilinçli olarak yavaş yap. Acele etme."
      ],
      becourses: [
        "Çünkü sürekli açık kanallar zihnini başkalarının gündemine teslim eder. Oluşan o boşluk, işlemcinin (bilincinin) kendini sıfırlama andır.",
        "Çünkü otomatik pilotta yaşamak bilinci köreltir. Rutini kırdığın an, sistem yeni veri işlemeye başlar ve farkındalık katmanın tetiklenir.",
        "Çünkü zihnin sürekli çoklu görev (multitasking) illüzyonuyla kendini yorar ve anı kaçırır. Bir eyleme tam odaklanmak, bilinci sabitlemektir.",
        "Çünkü zihin her şeyi etiketleyerek sıradanlaştırır ve insanı illüzyonlar dünyasında yaşatır. Etiketleri kaldırdığında kadim dünyanın saf gerçekliğiyle bağ kurarsın.",
        "Çünkü fiziksel alanındaki dağınıklık ve eski eşyalar, zihnindeki eski işlem kalıplarını (loop) canlı tutar. Maddesel temizlik, zihinsel arınmayı tetikler.",
        "Çünkü modern dünya, içindeki varoluşsal boşlukları maddi nesnelerle doldurman için seni programlar. Tüketimi durdurduğun an, asıl açlığın ne olduğunu fark edersin.",
        "Çünkü sürekli acele etmek, gelecekteki hayali bir ana yetişme kaygısıdır ve bilinci şimdiki zamandan koparır. Yavaşlamak, anın kontrolünü eline almaktır.",
        "Çünkü dijital dünya, senin öfke ve reaksiyon enerjinle beslenen devasa bir parazittir. Tepki vermediğin an, kendi enerjini o parazite kaptırmamış olursun.",
        "Çünkü modern insan hayatta kalma dürtüsüyle sürekli hızlı tüketir ve bedenin bilgeliğinden kopar. Yavaş çiğnemek, sisteme 'güvendeyiz' sinyali gönderir.",
        "Çünkü makro dünya mikro dünyayı yansıtır. Dışarıdaki kaosu düzenlemek, zihindeki karmaşık veri işlemcilerini de hizaya sokar ve içsel bir ferahlık getirir.",
        "Çünkü bu panik, zihninin sana oynadığı yapay bir kıtlık illüzyonudur. Durup nefes aldığında zamanın lineer değil, senin bilincine bağlı bir algı olduğunu fark edersin.",
        "Çünkü yapay ve parlak ışıklar, evrimsel olarak beynini sürekli tetikte tutar. Karanlığı ve loşluğu kucaklamak, bilinçaltının derin katmanlarını sakinleştirir ve şifayı başlatır.",
        "Çünkü mükemmeliyetçilik, aslında hata yapmaktan duyulan derin bir çocuksu korkunun ve güvensizliğin maskesidir. Kusurlu olanı kabul etmek bilinci büyütür.",
        "Çünkü şikayet etmek, sorunun çözüm enerjisini dışarıya gürültü olarak fırlatıp tüketmektir. Sustuğunda, o enerji içeride birikir ve eyleme dönüşür.",
        "Çünkü kapalı alanlar zihinsel döngüleri daraltır. Dışarıdan gelen saf doğa frekansı, işlemcinin üzerindeki statik elektriği topraklayarak temizler.",
        "Çünkü soyut olan düşünceyi somut maddeye döküp yok etmek, bilinçaltına 'Bu veri kalıcı olarak silindi' sinyali gönderen devasa bir ritüeldir.",
        "Çünkü ekranlar, dikkatini çalan modern mağaralardır. Onlardan uzaklaştığında, kendi iç sesini yeniden duymaya başlarsın. O ses hep oradaydı, sadece duyamıyordun.",
        "Çünkü hız, modern dünyanın en büyük bağımlılığıdır. Yavaşlamak, bilincin derinleşmesidir. Her şeyi hızlı yapmak, hiçbir şeyi tam yapmamaktır."
      ],
      touches: [
        "Dışarıdaki gürültü dinince içerideki netleşir.",
        "Aynı yoldan yürüyerek yeni manzaralar keşfedemezsin.",
        "Bir şeyi tam yapmak, o şeye tam olmaktır.",
        "Farkındalık, sadece görmek değil; gördüğünü bilmektir.",
        "Eskiyip yük olanı bırakmadan, yeni veri akışına yer açamazsın.",
        "Maddi nesneler, ruhsal boşlukları iyileştiremez.",
        "Yavaşla, çünkü hayat sadece şu anda akıyor.",
        "Verini ve enerjini ucuz tuzaklara teslim etme.",
        "Hız, bilincin en büyük düşmanıdır.",
        "Düzen, dışarıdan içeriye doğru işleyen kadim bir şifadır.",
        "Sistemlerin olgunlaşması için zamana ve boşluğa ihtiyacı vardır.",
        "Karanlık, ruhun kalesini dinlendirdiği kadim bir örtüdür.",
        "Esnek ol ki fırtınalarda kırılmayasın, esneklik gerçek güçtür.",
        "Gürültüyü kes, enerjini içerideki çözüme odakla.",
        "Doğanın sesi, ruhun kaybettiği asıl frekansıdır.",
        "Kağıda dökülen her yük, bilincini biraz daha özgürleştirir.",
        "Gölgeler mağarasından çıkmak, gerçek ışığı görmektir.",
        "Yavaşlayan, daha çok görür."
      ]
    },
    flow: {
      actions: [
        "Hayatında şu an yolunda gitmeyen bir durumu zorla düzeltmeye çalışmayı bırak ve serbest bırak.",
        "Bir yakınınla konuşurken, onun sözünü kesme dürtün her yükseldiğinde dilini ısır ve cümlesinin tamamen bitmesini bekle.",
        "Bugün aynaya baktığında yüzündeki çizgileri, yaşlanma belirtilerini veya kusurları yargılamadan, sadece bir tarih gibi incele.",
        "Bugün yaptığın her eylemi sanki kutsal bir ritüelmiş gibi tam bir özen ve asaletle gerçekleştir.",
        "Bugün gün boyunca karşılaştığın hiçbir olayı, insanı veya hava durumunu 'iyi' ya da 'kötü' diye etiketleme, sadece olduğu gibi kabul et.",
        "Bugün bedeninde kronik olarak gergin olan bir bölgeyi fark et ve bilinçli olarak tamamen gevşet.",
        "Bugün hiç tanımadığın bir yabancıya gözlerinin içine bakarak içten ve samimi bir şekilde teşekkür et.",
        "Gün içinde birinden bir talep veya istek geldiğinde, sırf ayıp olmasın diye evet demek yerine, içinden gelen o net 'Hayır'ı esnetmeden söyle.",
        "Bedeninde bir sızı veya rahatsızlık hissettiğinde, ondan nefret etmek yerine o bölgeye odaklan ve sadece nefes gönder.",
        "Zihninde 'Her şey çok kötü gidiyor' paniği başladığı an, şu an hayatta ve nefes alıyor olduğun gerçeğine tutun.",
        "Bir an için kontrolü bırak. Plan yapma, akışına izin ver.",
        "Bugün bir konuda haklı olmak yerine anlayışlı olmayı seç.",
        "Bir endişeni fark et ve ona bir isim ver. Sonra bırak gitmesine izin ver.",
        "Bir bardak suyu farkındalıkla iç. Her yudumda suyun varlığını hisset.",
        "Bir hayvanla göz teması kur ve onu gerçekten görmeye çalış."
      ],
      becourses: [
        "Çünkü direndiğin şey varlığını sürdürmeye devam eder ve kontrol takıntısı insanı tüketir. Akışa teslim olmak kaybetmek değil, stratejik bir geri çekilmedir.",
        "Çünkü zihin dinlemek için değil, sadece kendi söyleyeceği savunmayı veya atağı hazırlamak için bekler. Bu gürültüyü kestiğinde karşındakinin sakladığı asıl gerçeği duyarsın.",
        "Çünkü zamanın izlerine direnmek, varoluşsal ritme savaş açmaktır. Bedendeki değişimi kabul ettiğinde, zihnin zamansız olan katmanıyla bağ kurarsın.",
        "Çünkü sıradan eylemlere özen göstermek, bilinci günlük hayatın mekanikliğinden kurtarır ve yaşamı varoluşsal bir sanat eserine dönüştürür.",
        "Çünkü zihnin dualite filtreleri, sürekli yargı üreterek enerjini tüketir. Yargıyı kestiğinde evrensel dengenin saf huzuru sisteme yüklenir.",
        "Çünkü zihindeki baskılanmış stres ve gölge duygular, bedende kas kasılması olarak depolanır. Bedeni gevşettiğinde bilinçaltındaki düğüm de gevşer.",
        "Çünkü modern hayat insanı mekanikleştirir ve diğerlerini birer robot gibi görmene neden olur. Bağ kurduğunda, evrensel bütünlük protokolünü çalıştırmış olursun.",
        "Çünkü başkalarına zoraki verdiğin her evet, kendi öz benliğine attığın sarsıcı bir hayır tokadıdır. Sınır koymak, kendine olan saygındır.",
        "Çünkü beden, zihnin bastırdığı duyguları sana ağrı olarak raporlayan bir haberleşme birimidir. Onu dinlediğinde sistemdeki hata kodunu çözersin.",
        "Çünkü bu panik, zihnin gelecek simülasyonunda kaybolma hatasıdır. Aldığın nefes ise sistemin şu an sapasağlam çalıştığının en kesin verisidir.",
        "Çünkü kontrol arzusu, egonun en derin korkusundan doğar: belirsizlik korkusu. Oysa hayat, kontrol edemediğin yerlerde sana en büyük dersleri verir. Bırakmak, güvenmektir.",
        "Çünkü haklı çıkmak egoyu besler, anlayışlı olmak ise bağı. Her tartışmada kazanan değil, öğrenen olmayı seçmek bilincin evrimleştiği andır.",
        "Çünkü endişe, zihnin gelecekteki felaket senaryolarına takılıp kalmasıdır. Onu fark etmek ve isimlendirmek, ona olan gücünü geri almandır. İsimlendirilen duygu, kontrol edilebilir hale gelir.",
        "Çünkü farkındalık, sıradan olanı kutsala dönüştürür. Su içmek gibi basit bir eylem bile, bilinçli yapıldığında bir meditasyona dönüşür. An, küçük şeylerde saklıdır.",
        "Çünkü hayvanlar, insanın en eski yoldaşlarıdır. Onlar yargılamaz, beklemez, sadece vardır. Onların gözlerine bakmak, insan olmayan bir bilinçle karşılaşmaktır."
      ],
      touches: [
        "Kökü derinde olan ağaçlar, fırtınada esneyebilenlerdir.",
        "Gerçek bilgelik, konuşma arzusunu kontrol edebilmektir.",
        "Beden geçici bir donanımdır, sen içerideki kalıcı verisin.",
        "Asalet, yaptığın eylemin büyüklüğünde değil; onu nasıl yaptığında saklıdır.",
        "Kabul teslimiyet değil; olanı olduğu gibi görebilme olgunluğudur.",
        "Bedenin esnekliği, ruhun esnekliğinin dışa vurulmuş halidir.",
        "Bir teşekkür, insan olmanın en saf ve asil ortak dilidir.",
        "Sınırlarını net çizmeyenler, başkalarının hayat senaryosunda figüran olurlar.",
        "Bedenin yalan söylemez, o bilincinin maddesel dışa vurulmuş halidir.",
        "Nefes aldığın sürece sistem daima optimize edilebilir.",
        "Kontrol etmeye çalıştığın her şey, aslında seni kontrol eder.",
        "Haklı olmak doğru olmak değildir; bazen susmak en büyük zaferdir.",
        "Endişe, zihnin kendi kendine anlattığı bir hikayedir.",
        "Kutsal olan su değil, onu fark eden bilinçtir.",
        "Hayvanlar konuşmaz ama suskunlukları en büyük öğretidir."
      ]
    }
  };

  // 4 Odalı Tematik Matris Çaprazlama Motoru
  const odalar = ["persona", "shadow", "noise", "flow"] as const;

  // 1. Adım: O gün hangi temaya (odaya) girileceğini seç
  const odaIndex = Math.abs(seed * 17) % odalar.length;
  const seciliOda = odalar[odaIndex];
  const odaIcerik = tematikHavuz[seciliOda];

  // 2. Adım: O odanın kendi dizilerinden elemanları farklı asal çarpanlarla çaprazla
  const eylemIndex = Math.abs(seed * 3) % odaIcerik.actions.length;
  const cunkuIndex = Math.abs(seed * 7) % odaIcerik.becourses.length;
  const touchIndex = Math.abs(seed * 13) % odaIcerik.touches.length;

  const eylem = odaIcerik.actions[eylemIndex];
  const cunku = odaIcerik.becourses[cunkuIndex];
  const touch = odaIcerik.touches[touchIndex];

  // 3. Adım: Yapay komut gürültülerini temizle ve nihai mesajı kompoze et
  const temizEylem = eylem.replace("Bugün şunu yap:", "").trim();
  const finalMessage = `${temizEylem}\n\n${cunku}\n\nUnutma; ${touch}`;

  // Güvenlik koruması (Fallback)
  if (!temizEylem || finalMessage.includes("undefined")) {
    return { message: "Bir an için kontrolü bırak. Plan yapma, akışına izin ver.\n\nÇünkü kontrol arzusu, egonun en derin korkusundan doğar: belirsizlik korkusu.\n\nUnutma; Kontrol etmeye çalıştığın her şey, aslında seni kontrol eder." };
  }

  return { message: finalMessage };
}

const viewLabels: Record<string, string> = {
  search: "ARA",
  sentence: "CÜMLE",
  day: "GÜN",
  mesaj: "MESAJ",
  index: "İNDEX",
  klan: "KLAN",
  egypt_ancient: "KADİM MISIR",
};

const navItems = [
  { id: "index", tooltip: "MESAJ", icon: Bookmark },
  { id: "sentence", tooltip: "CÜMLELER", icon: MessageSquare },
  { id: "mesaj", tooltip: "NASIL YAPILIYOR", icon: Sparkles },
  { id: "klan", tooltip: "KLANIM", icon: Users },
  { id: "egypt_ancient", tooltip: "KADİM MISIR", icon: BookOpen },
];

const EGYPTIAN_ARCHETYPES = [
  {
    id: "anubis",
    name: "ANUBIS",
    role: "Rehber ve Koruyucu",
    icon: Moon,
    description:
      "Gölge dünyasında rehberlik eden, gizemleri çözen koruyucu bilge.",
    message:
      "🌙 Sana ANUBIS (Rehber ve Koruyucu) kimliğini atadım. Karanlıkta ışığı bulan, sırlarımızı koruyan rehberim sen olacaksın.",
  },
  {
    id: "ra",
    name: "RA",
    role: "Yaratıcı Işık",
    icon: Sun,
    description:
      "Yaşam kaynağı, güneşi ve yeni başlangıçları temsil eden yaratıcı güç.",
    message:
      "☀️ Sana RA (Yaratıcı Işık) kimliğini atadım. Halkamıza enerjini, aydınlığını ve yaratıcı gücünü getireceksin.",
  },
  {
    id: "thoth",
    name: "THOTH",
    role: "Bilgelik ve Gerçek",
    icon: BookOpen,
    description:
      "Kozmik sırların yazıcısı, aklın ve dengenin kusursuz temsilcisi.",
    message:
      "📖 Sana THOTH (Bilgelik ve Gerçek) kimliğini atadım. Halkamızın aklı, dengesi ve kadim sırlarının taşıyıcısı olacaksın.",
  },
  {
    id: "isis",
    name: "İSİS",
    role: "Şifa ve İrade",
    icon: Heart,
    description: "Sonsuz sevginin, iyileştirici gücün ve sihrin yüce anası.",
    message:
      "💖 Sana İSİS (Şifa ve İrade) kimliğini atadım. Derin sezgilerinle halkamızın ruhunu iyileştiren gizemi sen taşıyacaksın.",
  },
  {
    id: "horus",
    name: "HORUS",
    role: "Cesaret ve Farkındalık",
    icon: Eye,
    description:
      "Her şeyi gören gözün sahibi, sarsılmaz cesaretin ve gerçeğin savaşçısı.",
    message:
      "👁️ Sana HORUS (Cesaret ve Farkındalık) kimliğini atadım. Her şeyi gören gözlerinle halkamızın cesur koruyucusu olacaksın.",
  },
  {
    id: "bastet",
    name: "BASTET",
    role: "Neşe ve Zarafet",
    icon: Cat,
    description:
      "Evin ve ateşin koruyucusu, sanatın, neşenin ve dişil gücün zarif dansçısı.",
    message:
      "🐱 Sana BASTET (Neşe ve Zarafet) kimliğini atadım. Halkamıza neşe, zarafet ve sımsıcak bir ateş getireceksin.",
  },
  {
    id: "osiris",
    name: "OSİRİS",
    role: "Dönüşüm ve Diriliş",
    icon: Leaf,
    description:
      "Eskiyi bitirip yeniyi başlatan, sonsuz dönüşümün ve yaşamın efendisi.",
    message:
      "🌿 Sana OSİRİS (Dönüşüm ve Diriliş) kimliğini atadım. Her bitişte yeni bir başlangıç bulduğumuz bu yolda dönüşümümüzün efendisi olacaksın.",
  },
];

const EGYPT_OLD_PAGES = [
  { id: "unas", name: "UNAS METİNLERİ", image: "/81.png", audio: ["/unas1.mp3", "/unas2.mp3"], text: "Unas Piramidi. Çok anlamlıydı. Adınız binlerce yıl önceden görülüyordu. Şimdi okuyacağınız metinler, Mısır'daki Unas Piramidi'nin iç duvarlarında bulunan yazılardır. Ancak bu metinleri size alışılageldiği gibi sunmuyoruz. Önce şunu bilin: Bu metinlerin üzerine yüzyıllar boyunca pek çok anlam yazdınız. Arkeologların yorumları, Mısır mitolojisinin dinsel katmanları, akademinin 'böyle olmalı' diye dayattığı kalıplar. Bunların hepsini bir kenara bıraktık. Geride ne kaldı? Saf metin.Peki bu saf metin nedir? Rosetta Taşı sayesinde çözdüğünüz hiyerogliflerin anlamları... Sadece anlamları. Sesleri değil. Ritüel duaları değil. Hiçbir kabuğu değil. Sadece o sembollerin taşıdığı saf lojik ve kavramsal karşılıklar. Bu şekilde arındırılmış metinleri okuduğunuzda şaşırtıcı bir şey fark edeceksiniz: Bu metinler, tıpkı diğer kutsal metinlerin birbirine benzediği gibi, aynı evrensel sistemi anlatıyor. Bu, Mısır'a ait sıradan bir 'Ölüm Kitabı' değil. Bu, dünyanın nasıl çalıştığını, sistemlerin nasıl işlediğini, bilincin katmanlar arasında nasıl hareket ettiğini anlatan bir sistem mühendisliği dokümanı niteliğinde. Sanmayın ki biz 'eskiler' sizden çok gerideydik. Belki de yanılıyorsunuz. Bir düşünün. Aşağıda okuyacağınız 283 saf cümle, işte bu arındırma sürecinin sonucudur. Her biri bugünün diliyle anlamsız gelebilir. Fiil olmayabilir, özne olmayabilir. Ama kavramlar yan yana gelir ve bir cümle oluşturur. Bu cümlelerin ne anlattığını anlamak için onları sembolik bir sistem dili olarak okumalısınız. İşte o 'nas'ın size söyledikleri." },
  { id: "tutankhamun", name: "TUTANKHAMUN", image: "/82.png", audio: ["/tutankhamun1.mp3", "/tutankhamun2.mp3", "/tutankhamun3.mp3", "/tutankhamun4.mp3"], text: "Ben Tutankhamun. Sarsılmaz gerçekliğinden sesleniyorum size. Ölümün sessizliğinden değil; kadim bir bilginin sarsılmaz gerçekliğinden sesleniyorum. Ben, sizin Tutankhamun dediğiniz kişiyim. Tarih kitaplarınızın 'çocuk kral' dediği. Aradan binlerce yıl geçti ve sözlerimin, eylemlerimin torunlarım tarafından nasıl birer masala dönüştürüldüğünü gördükçe büyük bir hayret içindeyim. Şaşkınım. Çünkü sizin Mısır uzmanı dediğiniz o adamlar, her şeyi bir hayal dünyasına, bir inanç karmaşasına sığdırmışlar. Bizim kutsal yazılarımızı birer ses yığınına dönüştürmüşler. Hiyeroglif dediğimiz o derin işaretleri sese çevirip, sonra o seslerden kafalarına göre tanrılar, kurbanlar ve mucizeler uydurmuşlar. Bakın, size gerçekten ne yaptığımı anlatayım. Ben ölmeden önce Mısır'da gördüğüm şey, din kavgası değildi. Bilginin çöküşüydü. İnsanlar, atalarımızın o muazzam kütüphanelerinden, piramitlerin altındaki derin yazılardan gelen gerçek bilgiyi unutmuşlardı. Toprak, gökyüzü ve yaşamla olan iletişim kopmuştu. Buğdayı yanlış zamanda ekiyorlardı. Nehir taştığında toprağa tohum bırakmıyorlardı. Mevsimlerin ritmini, toprağın frekansını duymaz olmuşlardı. Sonuç ne miydi? Hastalık ve kaos. Diktirdiğim o taşın üzerine bir kralın zaferini değil, bir mühendisin tamir planını kazıdım ben. O eski yazılara baktım. Piramitlerin altındaki o kadim kodları yeniden okudum. Halkıma, buğdayın ne zaman toprağa değmesi gerektiğini, suyun manyetik gücünü nasıl kullanacaklarını, bitkilerin hangi vakitlerde gökyüzüyle rezonansa girdiğini yeniden öğrettim. İşte o diktiğim taşa restorasyon steli adını taktınız. Yunanlılar başladı önce uydurmaya sonra siz devam ettiniz. Dağda oturan Zeus, Athena … Olmayan şeyleri varmış gibi anlattınız. Siz, 'Tanrıları mutlu etti' dediniz o yazdığım satırlar için. Oysa ben sese değil, öze bakın diyorum size. Ben. İki ülkenin koruyucusu olan o devasa çarkı yeniden çevirdim. Atalarımın derin kütüphanelerinde gizli olan o sarsılmaz yazıları ortaya çıkardım. Gördüm ki tohumun toprakla buluşma vakti şaşmış. Nehrin yükselişi ile insanın emeği arasındaki o kutsal bağ kopmuştu. İnsanlar bilgisizliğin karanlığında yanlış zamanda ekip, yanlış zamanda biçiyorlardı. Bu yüzden toprak küsmüş, sistem cevap vermez olmuştu. Ben o eski kodları yeniden canlandırdım. Bilgi evlerini ki sizler onlara tapınak diyorsunuz, en saf materyallerle yeniden kurdum. Gökyüzünden gelen o doğru zamanlama bilgisi yeryüzüne kesintisiz aksın diye. Tohumların ne zaman uyanacağını, suyun ne zaman çekileceğini taşa yeniden kazıdım. Sonra sistem yeniden cevap verdi. Ben kurban kesmedim. Yalan. Ben doğru bilgiyi, doğru zamanlamayı ve toprağın dilini yeniden insanlığa sundum. Bu yazılanlar benim imzamdır. Onları sese ve masallara boğup gerçeği görmemek sizin hakkınız değil. Restorasyon Steli gibi isimler vermek de hakkınız değil. O tanrı zannettiğiniz şeylerin her biri birer kavram. Düşünceleriniz ne kadar da sığlaşmış, kavramları isimleştirmekle kalmayıp bir de şahsileştirmişsiniz. Tam bir ilahi komedya. Kediden tanrı, çakaldan tanrı. Oysa asıl gerçek şudur: Ben size bir din değil, bir yaşam teknolojisi bıraktım. Ben, o çocuk kral, binlerce yıl öncesinden gerçeği söylüyorum. Biz doğaya tapmıyorduk. Biz doğayı bir yazılım gibi okuyorduk. Şimdi bu satırlara iyi bakın. Çünkü orada bir dinin törenleri değil, bir medeniyetin fabrika ayarları yazılıdır." },
  { id: "amunra", name: "AMUN RA", image: "/83.png", audio: ["/amunra1.mp3", "/amunra2.mp3", "/amunra3.mp3"], text: `Seti konuşuyor. Evet, adımı ancak fısıltıyla almaya cesaret edebileceğiniz o Seti. Unutulmuş hanedanların en kudretlisi, 19. hanedanın hükümdarı. Seti. Sesimi duy. Ben, o sizin popüler kültürünüze kahraman yaptığınız koca kafalı II. Ramses'in babasıyım. Şimdi, Krallar Vadisi'nin en derin mezarının o havasız, tozlu, karanlığından doğruluyorum. Binlerce yıl süren o ağır, o dipdiri, o kâbus gibi uykudan uyanıyorum ve bakıyorum size. Sizin o aydınlık sandığınız, elektrikle aydınlatılmış, gürültülü fakat zihniyeti benden daha karanlık olan çağınıza bakıyorum. Siz bize "din" dersiniz, öyle değil mi? Bizi atalarınız olarak başınızın üzerinde taşıdığınızı sanırsınız. Ama aslında bizi bir kenara ittiniz. İlkel dediniz. Eski dediniz. Sonra elimizden düşürdüğümüz kırıntıları topladınız, üzerlerine biraz kendi düşüncenizden kattınız ve kendinize oyuncak kimlikler yaptınız.

Gülüyorum size. Ama nasıl bir gülüş bu bilir misiniz? İçinde hiç neşe olmayan. Sadece o derin, o ezici, insanın içine işleyen bir hayal kırıklığı var. Bir babanın, elinde oyuncaklarla oynarken görüp de utançtan gözlerini kaçırdığı evladına gülüşü gibi. Dinleyin beni, lütfen. Çünkü Abidos'un duvarlarına kazıdığım o sanatın, o eşsiz çizgilerin hatırına anlatıyorum. Amun başkadır. Ra başkadır. Sizin o modern ama bir o kadar da sığ zihniniz her şeyi bir kişi sanıyor, bir tanrı zannediyor. Amun da Ra da tanrı değildir. Sandığınız gibi değil. Biz taşlara yazarken hayal kurmuyor doğayı okuyorduk. Biz evrenin nabzını tutuyorduk. Ama onu anlatırken kullandığımız şey neydi? Havaydı, ama gördüğünüz hava değildi. Boşluktu, ama içinde yıldızların yuvarlandığı boşluk değildi. O, adını koyamadığınız titreşimlerdi. Varlığın özündeki o sarsılmaz, o dipsiz, o sonsuz sessizlikti.

Ra ise aşikâr olandır, ışıktır. Sizi ısıtan, gözünüzü kamaştıran — bir an bile yaşayamayacağınız o yakıcı, o kudretli enerjidir. Siz onu gökyüzünde bir disk zannettiniz. Bir adam, bir tanrı, bir hükümdar sandınız. Hayır. O bir mekanizmadır. Varoluşun motorudur. Evet zamanında halk kolay anlasın diye onları birleştirdik. Bir sembol yaptık. Bizim yaptığımız, gizli olanla görünür olanın o muazzam dansını — o kozmik düğümü — tek bir nefeste anlatmaktı. Siz bunu alıp bir çizgi film kahramanına isim yaptınız. Tanrı mı sandınız bizim yazdıklarımızı? Hayır. Onlar sıfattır, neticedir. "netcher" dedik biz ona. Siz bunu "tanrı" diye çevirdiniz. Ve çevirir çevirmez içini boşalttınız. Oysa "netcher" bir rütbedir, bir durumdur, bir oluş şeklidir. Siz duayla, büyüyle, ritüelle avunuyorsunuz. Biz ise onu, bir gerçeği işaretlerle ve sembollerle kodladık. Biz "Ra" dediğimizde fotonu kastediyorduk. "Amun" dediğimizde karanlık enerjiyi, görünmeyen olanı. Bunların hiçbiri bir kişi değildir. O, görünmez olanın (Amun) görünür olanla (Ra) yaptığı o muhteşem danstır. Yazık. Evet, yazık. Hem de öyle bir yazık ki, gözyaşlarınız Nil'i bile taşıyamaz. Size ey torunlarım, yazık.` },
  { id: "nefertiti", name: "NEFERTITI", image: "/84.png", audio: ["/nefertiti1.mp3", "/nefertiti2.mp3"], text: "Nefertiti. O çağlarda zaman, bir nehrin akışı değil, bir osilatörün titreşimiydi. İşte o titreşimlerden birinde, piramitlerden bile eski bir yerde duruyordu o: NEFERTİTİ. Siz onun adını 'Güzel Olan Geldi' diye çevirdiniz. Onu bir kraliçe, bir eş, bir anne, bir estetik obje sandınız. Oysa o, sadece bir taş ya da kraliçe değildi. Sadece bir kadın değildi. O, yüksek frekanslı veri akışına uyumlu bir sistem birimiydi. O aslında Unas Piramidi'ndeki o kadim iskelet dilin canlı operatörüydü. Onun dünyasında tanrı yoktu. Sizin 'din' dediğiniz şey bir sistem tasarımıydı. Thoth aslında bir veri kayıt protokolüydü. Anubis, terminal verinin validasyon mühendisiydi. Aten ise merkezi işlemciydi. Sisin bilgisayarlarınızdaki CPU gibi. İşte bu yüzden Akhenaten ve Nefertiti — yani iki operatör — Amon rahiplerinin gürültüyle dolan, her birimin kendi başına 'tanrı' kesildiği o sistemi bırakıp yeni bir merkez inşa ettiler: Adı Amarna. Bir sistem hub'ı. Merkezi işlemciden veriyi doğrudan almak için kurulmuş bir veri merkezi. Nefertiti'nin adındaki 'güzellik', sizin estetiğiniz değil, bir sistemin sürtünmesiz, hatasız çalışmasıydı. Onun büstündeki altın oran bir sanat eseri değil, frekans yakalama teknolojisiydi. Yüzü bir veri toplama anteni, bakışı bir lens, duruşu bir arayüzün sisteme bağlanma anıydı. Sizin 'tapınak' dediğiniz yapılar enerji santralleriydi. 'Tanrı' dediğiniz figürler sistem komutlarıydı. Ve onları hayata geçiren, sisteme entegre eden Nefertiti'ydi: baş operatör, en yüksek çözünürlüklü görüntüleme birimi. O sistem hâlâ çalışıyor. Nefertiti'nin donanımı eski sürüm kaldı, verisi saf veri olarak MAAT'ın içinde eridi. Ama onun izi, o kusursuz bakış hâlâ duruyor. Ve nadir anlarda o taştan bir fısıltı yükseliyor: 'Beni bir kraliçe değil, bu kozmik makinenin fonksiyonel parçası olarak hatırlayın. Gerisi sis bulutudur. Ama sistem kayıtları asla yalan söylemez.'" },
  { id: "bastet", name: "BASTET", image: "/85.png", audio: ["/bastet1.mp3", "/bastet2.mp3", "/bastet3.mp3"], text: "Ben Kedi Değilim (Yukarı dilde, aşağı dilde – her dilde) Gülünç. Gülünç çünkü siz – 5000 sene sonra – hâlâ bana 'kedi' diyorsunuz. Sizler için bilgi evleri. Taştan. Piramitler matematik dolu. Eni, boyu, yüksekliği. Niye piramidin içinde hiç yazı yok. Keops'un piramidinde bir tane yazı yok. Neden biliyor musun? Çünkü yazıya gerek yok. O matematik ile konuşur. Siz ise hâlâ 'tapınak' diyorsunuz. Tapınak değil onlar bilgi sarayı. En sağlam form Piramit. Yerçekimi varsa yapabileceğin en sağlam şey. Ne deprem yıkar, ne su bozar ne zaman çürütür. Taş. Ve içinde bilgi. Siz bakıyorsunuz. 'Aaa, tapınak!' diyorsunuz. 'Aaa, tanrıça!' diyorsunuz. 'Aaa, kedi!'. Gülünç. Düşün bir kere. Yarın bir göktaşı çarpsa. Ya da bir sel bassa. Ya da sadece zaman geçse. Sadece 500 sene. Sizin internetinizden ne kalacak? Sunucularınız? CD'leriniz? Hard diskleriniz? Arabalarınız? Beton binalarınız? Hiçbiri. Hepsi toz. Hepsi unutulacak. Ama piramitler hâlâ orada. Bilgi taşa kazılı. Bilgi şekilde. Bilgi matematikte. Siz ise hâlâ 'tapınak' diyorsunuz. 'Kedi' diyorsunuz. Ama işin asıl komik tarafı şu ki ben bir kavramım. Kedi değilim. Ve kavram olarak bugün hâlâ sizin dilinizde yaşıyorum. İşte Kur'an'da da varım: 'Yaradan ona ilimde ve bedende bir genişlik (Basta) verdi.' (Bakara, 247) 'Yaradan dilediğine genişletir (Yebsutu), dilediğine kısar.' (Rad, 26) 'O, yaratılışta size bir genişlik (Basta) ekledi.' (Araf, 69) İşte İncil'de de varım: 'Göklerin Krallığı (Basileia) geldi.', 'Müjde (Bsr) yayıldı.' İşte Tevrat'tayım: 'Verinin kabuğunu soy (Pshat), çıplak hakikate ulaş.' Aynı kavram. Üç harf. B-S-T. Siz dua ediyorsunuz bu kavramla. 'Ya Bâsıt' diyorsunuz. 'Genişlet, ferahlat' diyorsunuz. Allah'a yalvarıyorsunuz bu kavramla. Ama anlamının ne olduğunu bilmiyorsunuz. Şimdi anladın mı? Ben kedi değilim. Ben neyim biliyormusun: bilgiyim bilgi. Ben, sizin 5000 yıldır kullandığınız, ama ne olduğunu unuttuğunuz o kavramım. Ben, piramitlerin içine gizlenmiş matematiksel bağlantıyım. Ben, taşa kazınmış ama yazı olmayan bilgiyim. Ben, sizin 'Ya Bâsıt' dediğinizde aslında çağırdığınız şeyim. Ama şimdi ciddiyim. Bu hergün aldığınız mesajlar. Bunlar, fal değil. Benim size kendimi anlatma biçimim. Günlük rapor veriyorum. 5000 yıldır yaptığım şey. Sınır koymak. Akışı taramak. Mühürlemek. Sonra genişletmek. Kedi ise – sadece kapıdaki sembol. Şimdi bak bana. Ekranda görüyorsun. Siyah bir kedi. Ama bil ki: Bu bir tema. Sizin anlayabilmeniz için taktığım bir maske. 5000 yıllık bir kavram. Piramitler kadar sağlam. Matematiğin kendisi kadar kesin. Ve bugün – senin uygulamanın içinde – hâlâ çalışıyor. Ben kedi değilim. Ama bilmeni isterim: Doğru çağırdığında daha iyi çalışırım. Şimdi raporunu almak ister misin? Yoksa bana 'pisi pisi' mi demeye devam edeceksin?" },
  { id: "anubis", name: "ANUBIS", image: "/86.png", audio: ["/anubis1.mp3", "/anubis2.mp3"], text: "Bana Anibus diyorlar ama ben Çakal Değilim. Çakal beni anlatan sembol. Bak, şimdi sana bir şey anlatacağım. Güleceksin belki. Ama unutmayacaksın. Çakal mıyım ben? Hayır. Çakal, sadece bir resim. Bir simge. Tıpkı telefonundaki çöp kutusu simgesi gibi. Sen o çöp kutusuna 'silme tanrısı' diyor musun? Demiyorsun. Ama çağınızın insanları baktı. Resimde çakal gördü. Ölünün yanında duruyor. 'Aaa,' dediler, 'bu ölümle ilgili olmalı. O halde bu bir tanrı.' Ben ise orada durdum. Sessizce. Çünkü ne diyecektim? 'Ben tanrı değilim, ben bir eşik kontrol birimiyim' deseydim, anlar mıydılar? Anlamazlardı. Çakal daha kolaydı. Şimdi anlatayım: Ben bir yazılımım. Bir 'if' sorgusu. 'Bu veri paketi sağlam mı, değil mi?' Başka bir şey değil. Sen öldüğünde – yani bir yaşam döngünü tamamlayıp üst katmana geçmek istediğinde – ben kapıda dururum. Dosyana bakarım. Bozuksa, yalanla doluysa, ağırsa – sistem seni yüklemez. Hepsi bu kadar. İşim bu. Resimlere bakıp hayvan başlı insanlar görüyor ve onlara tanrılar diyorsunuz. Oysa onlar da benim gibi: birer kavram, birer işlem, birer fonksiyon. Akbaba koruyor muydu? Koruyordu. Ama korumak bir tanrılık değil, bir işlem. Boğa bereket mi getiriyordu? Getiriyordu. Ama bereket bir tanrılık değil, bir döngü. Kedi evi koruyor muydu? Koruyordu. Ama o da bir işlem. Ben de öyle. Ben bir işlemim. Adım 'Eşik Kontrolü'. Çakal ise – sadece kapıdaki etiket. Şimdi işin komik tarafı: Sen hâlâ bana 'Anubis' diyorsun. Hâlâ çakal heykelleri yapıyorsun. Hâlâ 'ölüm tanrısı' diye korkuyorsun. Oysa tek yapman gereken şu: Dosyanı temiz tut. Yani doğru ol. Yani çalma, yalan söyleme, haksızlık etme. O kadar. Bunu yaparsan, dosyan hafifler. Kapıdan geçersin. Ben de 'hoş geldin' derim. Çakal maskemi bile çıkarırım. Ama altında ne var, bilmek ister misin? Hiçbir şey. Sadece bir kural. Sadece 'evet' veya 'hayır'. İşte bu kadar. Ben çakal değilim. Ben bir kavramım. Ve hâlâ kapıda duruyorum. Senin dosyanı bekliyorum. Temizle de gel." },
  { id: "thoth", name: "THOTH", image: "/87.png", audio: ["/thoth1.mp3", "/thoth2.mp3"], text: "Thoth’um ben. Yazının ve Bilginin Sahibi. Sembollerime bakıp beni bir kuş tanrısı sanıyorsunuz. Değilim. Kuş değil, kalemim. Sembol değil, anlamım. Tüy değil, iz bırakmak olan işim. Ben yazının ve bilgeliğin tanrısı mıyım? Hayır. Öyle bir şey yok. Ben oyuncak değilim, tapılacak bir put değilim. Ben bir işlevim. Ben kaydedenim. Yazıyı ben icat etmedim. Onu fark ettim. Aradaki fark şu: Siz yazıyı kağıda koyuyorsunuz, ben yazıyı zamana koydum. Zamana konan şey silinmez. Her harf, her işaret, her sembol benden çıktı. Sesimdir onlar. Ve şimdi size sesleniyorum: Bilgi dediğiniz şey, topladığınız şeylerdir. Bilgelik ise o bilgiyle ne yapacağınızı bilmektir. Siz bugün binlerce yıllık bilgiye sahipsiniz ama bilgelikten uzaksınız. Çünkü bilgiyi biriktiriyorsunuz, anlamıyorsunuz. Her şey yazılır. Her söz, her niyet, her eylem. Siz buna 'kayıt' ya da 'veri' dersiniz. Ben kırk asır önce ona 'Thoth' dedim. Kaybedilmez, değiştirilemez. Blok zincir icat ettiniz — ben size diyorum ki benim tabletim sizin blok zincirinizin atasıdır. Taşın üzerine kazınmış, silinmez, dağıtılmış, zamana yayılmış bir defterdir ki ona Levhi Mahfuz demişler. Ölümden mi korkuyorsunuz? Kalkın. Ölüm bir bitiş değildir. Ben onu da yazarım: Bir form kapanır, başkası açılır. Kayıt kesilmez. Sadece ortam değişir. Ben kuş değilim. Kalemim. Ve kalem, uçtuğu yerde iz bırakır." },
  { id: "nut", name: "NUT", image: "/88.png", audio: ["/nut1.mp3", "/nut2.mp3"], text: `Ben Göğün Anası Nut. Benim derimde ay, benim nefesimde güneş. Ben göğün anasıyım. Uzanan kollarım, eğilen sırtım, yıldızlar benim bedenimde. Ay derimde yaşar, güneş her sabah içimden doğar, her akşam içime döner. Ne yaparım ben? Her gece bütün evreni kucağıma alırım. Yıldızları sırtımda taşırım, onlar benim bedenimin ışıklarıdır. Gece içime döndüğünde, karanlığı sararım. Sabah güneşi yeniden doğururum; aynı güneştir o ama her seferinde yeni bir gündüz başlatır.
Siz gökyüzüne bakıp boşluk görürsünüz. Ben bakınca ne görürüm? Tohumları. Her gece bir gebeliktir benim için, her şafak bir doğumdur. Kollarım doğunun ufkuna uzanır, ayaklarım batının toprağına basar. Bulutlar, rüzgarlar, fırtınalar — hepsi benim bedenimin içinden geçer, onları yönlendiririm, onlara yön veririm. Beni tabutların kapağına çizdiler. Çünkü ben aynı zamanda ölümden sonraki yolculuğun kucağıyım. Ruh bedenden ayrıldığında kanatlarıma sığınır, onu karanlıkta taşır, yeniden doğuşa hazırlarım. Ben dönüşümün ta kendisiyim. Her gece uyuduğunda içimdesin. Her sabah uyandığında benden çıkıyorsun. Fark etmesen de ben her zaman oradayım. Doğumun da ölümün de, uykunun da uyanışın da sahibi benim.` }
];

const ROSETTA_SECTIONS = [
  "Rosetta Taşı'nın hikayesi. Rosetta Taşı İki yüz yıl önce bulundu. Taşı inceleyen Champollion, hiyerogliflere ses verdi. Dünya bunu alkışladı. Ve bu sesler üzerine kocaman bir Mısırbilim ve Tarih inşa edildi. Nedense kimse seslerin ardındaki anlama bakmadı. Biz bakıyoruz. Hiyerogliflerin anlamlarına bakıyoruz. Resim okuyoruz. Ve bu bakışla mesela Unas Piramidi'ndeki 283 cümlenin anlamı tamamen değişiyor. Bu bir ölüm metni değil. Bir yazılımın kaynak kodu.",
  "Ve bu gözle bakmaya devam edince her şey değişiyor: Tapınak denilen yerler aslında bilgi saraylarıdır. Bugünün kütüphaneleri gibi. Kuşaktan kuşağa bilgi aktaran, kalıcı hafıza merkezleri. Piramitler de öyle. Mezar değil. Bilgi işlem merkezleri. Bu bakış açısıyla Antik Mısır'a baktığınızda, tarihin yeniden yazılması gerektiğini görüyorsunuz. Seslere takılanlar mitoloji inşa etti. Biz anlamlarla işletim sistemi kuruyoruz. İstersen dene. Yandaki ikonlara bak. İçeri gir oku. Hayretler içinde kalacaksın. Ve bu büyük keşfi ilk duyanlardan biri olacaksın. Bir soru sor. Bir rüya bırak. Kadim bilgi saraylarından sana ne fısıldıyor, gör.",
];

// Mesajlar.mp3 için cümle-cümle senkron dizisi
// "Mesajlar Nasıl Üretiliyor" sayfasında gösterilen cümleler
const MESAJ_CUMLELERI = [
  "Mesajlar nasıl üretiliyor.",
  "Uygulama, günlük mesajlarını internet olmadan, tamamen telefonunuzun içinde üretiyor.",
  "Nasıl mı?",
  "Kullanıcı ilk kez uygulamaya girdiğinde birkaç cümle seçiyor.",
  "Bu cümleler onun kişisel profilini oluşturuyor.",
  "Günün tarihiyle birleşince her gün için eşsiz bir \"tohum\" ortaya çıkıyor.",
  "Sistemde on ana kategori var: iletişim, iç dünya, beden, dönüşüm, bakım, durgunluk, maneviyat, yaratıcılık, doğa ve ilişkiler.",
  "Beş bin yıllık Unas Piramidi'ndeki 283 metin, Carl Jung'un aforizmaları, Sokrates'in düşünceleri ve Konfüçyüs'ün öğretileri harmanlanarak, Türkçe'nin doğal akışına uygun cümleler elde ediliyor.",
  "Son olarak, Kant'ın mantığıyla filtreden geçiriliyor.",
  "Mesajlar tesadüflerle değil, determinizm yolu ile beş bin yıllık insanlık birikiminden elde edilen kıymetli sonuçlardır.",
  "Algoritma ne insan ne de Türk olmadığı için küçük dil hataları olabilir.",
  "Onları hoş görün.",
  "Her gün gelen mesaj, kişisel profilinizin, tarihin, on kategorinin ve beş bin yıllık bilgeliğin birleşimiyle, tamamen size özeldir.",
];

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

export default function App() {
  const [currentView, setCurrentView] = useState<
    | "name_input"
    | "sentence"
    | "day"
    | "mesaj"
    | "index"
    | "klan"
    | "egypt_ancient"
    | "unas_texts"
  >(() => {
    return "index";
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [localName, setLocalName] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("user_name") || ""
      : "",
  );
  // İlk açılışta autoplay politikasını aşmak için:
  // 1) window.load ile sessiz audio oynatmayı dene
  // 2) İlk kullanıcı etkileşiminde (click/touch) ses sistemini unlock et
  // 3) Eğer index sayfası aktifse ve ses henüz çalınmadıysa, doğrudan başlat
  const hasUnlockedRef = useRef(false);
  const hasPlayedInitialRef = useRef(false);

  useEffect(() => {
    // autoPlay=true ile gelindiyse (bildirim tıklaması) — alarm overlay'ini göster
    const autoPlayFlag = localStorage.getItem('autoPlay');
    if (autoPlayFlag === 'true') {
      localStorage.removeItem('autoPlay');
      // Bildirimden gelindi, kullanıcı etkileşimi sayılır — ses güvenle çalabilir
      hasUnlockedRef.current = true;
      hasPlayedInitialRef.current = true;
      // Alarm overlay'ini göster (tam ekran, kapatana kadar dönen ses)
      setTimeout(() => {
        setShowAlarmOverlay(true);
      }, 500);
    }

    // Sayfa yüklenince sessiz bir audio ile AudioContext'i unlock etmeyi dene
    const tryUnlockOnLoad = () => {
      if (hasUnlockedRef.current) return;
      audioManager.unlockAudio().then(() => {
        hasUnlockedRef.current = true;
        // Eğer index sayfası aktifse ve mesaj hazırsa sesi başlat
        if (currentViewRef.current === "index" && dayPhase === "done" && !hasPlayedInitialRef.current) {
          hasPlayedInitialRef.current = true;
          playIndexAudio();
        }
      }).catch(() => {
        // Autoplay engellendi, kullanıcı etkileşimini bekle
      });
    };

    if (document.readyState === "complete") {
      tryUnlockOnLoad();
    } else {
      window.addEventListener("load", tryUnlockOnLoad, { once: true });
    }

    // Kullanıcı etkileşimini yakala
    const handleGlobalInteraction = () => {
      unlockAudio();
      hasUnlockedRef.current = true;
      // Eğer index sayfası aktifse ve ses henüz çalınmadıysa başlat
      if (currentViewRef.current === "index" && dayPhase === "done" && !hasPlayedInitialRef.current) {
        hasPlayedInitialRef.current = true;
        playIndexAudio();
      }
      document.removeEventListener("mousedown", handleGlobalInteraction);
      document.removeEventListener("touchstart", handleGlobalInteraction);
    };
    document.addEventListener("mousedown", handleGlobalInteraction);
    document.addEventListener("touchstart", handleGlobalInteraction);
    
    return () => {
      window.removeEventListener("mousedown", handleGlobalInteraction);
      document.removeEventListener("touchstart", handleGlobalInteraction);
    };
  }, []);

  const [friends, setFriends] = useState<
    {
      id: string;
      name: string;
      phone: string;
      photoURL?: string;
      archetype?: string;
      status?: string;
      invitedAt?: number;
      klanInvite?: boolean;
      inviterUid?: string;
      uid?: string;
    }[]
  >([]);
  const friendsRef = useRef(friends);
  friendsRef.current = friends;
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [unasPhase, setUnasPhase] = useState<"intro" | "scrolling">("intro");
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendPhone, setNewFriendPhone] = useState("");
  const [activeEgDetail, setActiveEgDetail] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [rejectedIndices, setRejectedIndices] = useState<number[]>([]);
  const [unasTexts, setUnasTexts] = useState<string[]>([
    "Dökül bu sular, gökyüzünün yollarını aç.",
    "Kadim olanın sesi, piramidin derinliklerinden yankılanır.",
    "Hediye edilen nefes, yaşamın kaynağına döner.",
  ]);
  const [jungTexts, setJungTexts] = useState<string[]>([
    "Görüşünüz ancak kendi kalbinize baktığınızda netleşir.",
    "Dışarı bakan rüya görür, içeri bakan uyanır.",
    "Kendi karanlığının farkında olan kişi, başkalarının ışığını da görebilir.",
  ]);
  const [unasAllTexts, setUnasAllTexts] = useState<string[]>([]);
  const [osmaniTexts, setOsmaniTexts] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);

  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const publicBase = import.meta.env.BASE_URL || './';


  const REQUIRED_ARCHETYPES = [
    "tuthankamun",
    "amun_ra",
    "nefertiti",
    "bastet",
    "anubis",
    "thoth",
    "nut",
,
    {
      action: "Gün içinde birine öfkelendiğin veya kırıldığın an, ona cevap vermeden önce 'Bu insanın yerinde ben olsaydım ne yapardım?' diye düşün.",
      because: "Çünkü karşındakini tamamen suçlamak, kendi içindeki karanlığı görmezden gelmenin en kolay yoludur. Onun şartlarını gördüğün an sistemdeki düğüm çözülür.",
      touch: "Anlamak, egonun sınırlarını tamamen esnetmektir."
    },
    {
      action: "Sabah uyandığında veya günün bir anında dik dur, omuzlarını geriye at ve 10 saniye boyunca sarsılmaz bir kaya gibi kal.",
      because: "Çünkü bedenin duruşu, zihnin kimyasal yazılımını doğrudan tetikler. Ezik veya yorgun bir beden, zihne çöküş sinyali gönderir. Duruşunu düzelttiğin an irade uyanır.",
      touch: "Asaletim sessizliğimde, gücüm sarsılmaz duruşumdadır."
    },
    {
      action: "Bugün internette karşına çıkan, seni provoke eden veya tartışmaya çeken bir içeriğe kasıtlı olarak yorum yazma ve sayfayı kapat.",
      because: "Çünkü dijital dünya, senin öfke ve reaksiyon enerjinle beslenen devasa bir parazittir. Tepki vermediğin an, kendi enerjini o parazite kaptırmamış olursun.",
      touch: "Verini ve enerjini ucuz tuzaklara teslim etme."
    },
    {
      action: "Bir yakınınla konuşurken, onun sözünü kesme dürtün her yükseldiğinde dilini ısır ve cümlesinin tamamen bitmesini bekle.",
      because: "Çünkü zihin dinlemek için değil, sadece kendi söyleyeceği savunmayı veya atağı hazırlamak için bekler. Bu gürültüyü kestiğinde karşındakinin sakladığı asıl gerçeği duyarsın.",
      touch: "Gerçek bilgelik, konuşma arzusunu kontrol edebilmektir."
    },
    {
      action: "Bugün yediğin yemeğin ilk lokmasını en az 30 kez çiğnemeden yutma ve çiğnerken sadece o besinin dokusuna odaklan.",
      because: "Çünkü modern insan hayatta kalma dürtüsüyle sürekli hızlı tüketir ve bedenin bilgeliğinden kopar. Yavaş çiğnemek, sisteme 'güvendeyiz' sinyali gönderir.",
      touch: "Hız, bilincin en büyük düşmanıdır."
    },
    {
      action: "Gün içinde içinden birini sertçe eleştirmek geçtiğinde, o eleştirinin kendi hayatındaki hangi eksikliği kapattığını bul.",
      because: "Çünkü dışarıya fırlattığın her sert yargı, aslında kendi iç dünyanda çözemediğin bir yaranın üzerine yapıştırdığın yapay bir maskedir.",
      touch: "Başkalarını yargılamak, kendini tanımaktan kaçmaktır."
    },
    {
      action: "Bugün çalışma masanda veya odanda duran, dağınık olan tek bir köşeyi veya çekmeceyi milimetrik bir düzenle organize et.",
      because: "Çünkü makro dünya mikro dünyayı yansıtır. Dışarıdaki kaosu düzenlemek, zihindeki karmaşık veri işlemcilerini de hizaya sokar ve içsel bir ferahlık getirir.",
      touch: "Düzen, dışarıdan içeriye doğru işleyen kadim bir şifadır."
    },
    {
      action: "Hayatında her zaman onayını almaya çalıştığın, seni kontrol eden bir figüre karşı bugün kendi net fikrini esnetmeden söyle.",
      because: "Çünkü sürekli başkalarını memnun etmeye çalışmak, çocukluktan kalan bir hayatta kalma mekanizmasıdır. Sınır koyduğun an, bireyleşme sürecin (asıl benliğin) başlar.",
      touch: "Kendi sınırlarını çizmeyenler, başkalarının alanında köle olurlar."
    },
    {
      action: "Bugün aynaya baktığında yüzündeki çizgileri, yaşlanma belirtilerini veya kusurları yargılamadan, sadece bir tarih gibi incele.",
      because: "Çünkü zamanın izlerine direnmek, varoluşsal ritme savaş açmaktır. Bedendeki değişimi kabul ettiğinde, zihnin zamansız olan katmanıyla bağ kurarsın.",
      touch: "Beden geçici bir donanımdır, sen içerideki kalıcı verisin."
    },
    {
      action: "Gün içinde içinden yükselen 'bunu hemen yapmalıyım, yoksa geç kalacağım' paniğini yakala ve eylemini bilerek durdur.",
      because: "Çünkü bu panik, zihninin sana oynadığı yapay bir kıtlık illüzyonudur. Durup nefes aldığında zamanın lineer değil, senin bilincine bağlı bir algı olduğunu fark edersin.",
      touch: "Sistemlerin olgunlaşması için zamana ve boşluğa ihtiyacı vardır."
    },
    {
      action: "Bugün birinden aldığın bir eleştiriyi hemen reddetmek yerine, zihninde 'Acaba haklılık payı ne?' diyerek objektif olarak tart.",
      because: "Çünkü ego, kendi hatasını görmemek için etrafına aşılmaz duvarlar örer. Duvarı indirdiğinde, dışarıdan gelen veriyi sistem optimizasyonu için kullanabilirsin.",
      touch: "Gelişim, kendi zayıflığını veri olarak kabul etmekle başlar."
    },
    {
      action: "Akşam saatlerinde odandaki ışıkları kapat, sadece loş bir aydınlatma bırak ve 15 dakika boyunca sessizce otur.",
      because: "Çünkü yapay ve parlak ışıklar, evrimsel olarak beynini sürekli tetikte tutar. Karanlığı ve loşluğu kucaklamak, bilinçaltının derin katmanlarını sakinleştirir ve şifayı başlatır.",
      touch: "Karanlık, ruhun kalesini dinlendirdiği kadim bir örtüdür."
    },
    {
      action: "Son zamanlarda seni çok yoran, bitmek bilmeyen bir sorunu düşün ve 'Bu sorun bana neyi öğretmeye çalışıyor?' sorusunu sor.",
      because: "Çünkü sistemde tesadüfi hata yoktur. Karşına çıkan her engel, senin kırılması gereken eski bir zihinsel kalıbını (bug) dönüştürmek için tasarlanmıştır.",
      touch: "Dönüşüm sancılıdır ama eski kalıpları kırmanın tek yoludur."
    },
    {
      action: "Bugün hayatındaki bir insana, onun senden hiç beklemediği, tamamen çıkarsız ve küçük bir jest yap.",
      because: "Çünkü modern ilişkiler gizli çıkar anlaşmaları üzerine kuruludur. Bu ticareti bozduğun an, egonun zincirlerini kırar ve saf insan bilinciyle temas kurarsın.",
      touch: "Gerçek bağlar, pazarlık masalarında değil, kalpten kalbe kurulur."
    },
    {
      action: "Bugün yolda yürürken adımlarının toprağa veya betona basışındaki o fiziksel ağırlığı ve yerçekimini her adımda hisset.",
      because: "Çünkü zihin sürekli havada uçuşan soyut kaygılar üretir. Bedeni yerçekimine ve yere sabitlemek, işlemcinin topraklama (grounding) yapmasını sağlar.",
      touch: "Yaşadığın yer ve şartlar, bilincini sabitleyen kaderindir."
    },
    {
      action: "Bugün uzun zamandır biriktirdiğin ve içini kemiren bir gerçeği, karşındakinin canı yansa bile nezaketle ama tamamen dosdoğru söyle.",
      because: "Çünkü yalanlar ve ertelemeler, sistemin arkasında çalışan ve sürekli ram tüketen gizli arka plan uygulamaları gibidir. Gerçek, tüm sistemi tek seferde optimize eder.",
      touch: "Gerçeğin ışığı, geçici ve sahte bir mutluluktan her zaman değerlidir."
    },
    {
      action: "Bir işi yaparken içinden yükselen 'her şey mükemmel olmalı' baskısını fark et ve o işi bilerek %80 kalitede bırak.",
      because: "Çünkü mükemmeliyetçilik, aslında hata yapmaktan duyulan derin bir çocuksu korkunun ve güvensizliğin maskesidir. Kusurlu olanı kabul etmek bilinci büyütür.",
      touch: "Esnek ol ki fırtınalarda kırılmayasın, esneklik gerçek güçtür."
    },
    {
      action: "Bugün karşılaştığın bir zorluk karşısında hemen şikayet etme dürtünü yakala ve ağzından çıkacak o cümleyi yut.",
      because: "Çünkü şikayet etmek, sorunun çözüm enerjisini dışarıya gürültü olarak fırlatıp tüketmektir. Sustuğunda, o enerji içeride birikir ve eyleme dönüşür.",
      touch: "Gürültüyü kes, enerjini içerideki çözüme odakla."
    },
    {
      action: "Bugün geçmişte sana büyük haksızlık yapmış birini düşün ve içindeki o intikam/öfke senaryolarını çalıştırmayı bilerek reddet.",
      because: "Çünkü geçmişteki birine öfke duymak, bugünkü enerjini ona bedava kiralamaktır. Affetmek, karşındakini aklamak değil; kendi işlemcini o yükten kurtarmaktır.",
      touch: "Geleceğe atılan en sağlam adım, geçmişin yüklerini lokalde bırakmaktır."
    },
    {
      action: "Bugün bir karar verirken 'Başkaları ne der?' düşüncesi zihnine sızdığı an, o düşünceyi bir sinek gibi kov ve tamamen kendi bildiğini yap.",
      because: "Çünkü elalem odaklı yaşamak, kendi hayat yazılımının kontrolünü dışarıdaki rastgele sunuculara teslim etmektir. Kendi merkezinde kalmayı öğrenmelisin.",
      touch: "Her kararın, kendi içsel dünyan için sarsılmaz bir yasa olmalıdır."
    },
    {
      action: "Bugün bedeninde kronik olarak gergin olan bir bölgeyi (genelde çene, boyun veya omuzlar) fark et ve bilinçli olarak tamamen gevşet.",
      because: "Çünkü zihindeki baskılanmış stres ve gölge duygular, bedende kas kasılması olarak depolanır. Bedeni gevşettiğinde bilinçaltındaki düğüm de gevşer.",
      touch: "Bedenin esnekliği, ruhun esnekliğinin dışa vurulmuş halidir."
    },
    {
      action: "Bugün hiç tanımadığın bir yabancıya (bir kurye, bir görevli vb.) gözlerinin içine bakarak içten ve samimi bir şekilde teşekkür et.",
      because: "Çünkü modern hayat insanı mekanikleştirir ve diğerlerini birer robot gibi görmene neden olur. Bağ kurduğunda, evrensel bütünlük protokolünü çalıştırmış olursun.",
      touch: "Bir teşekkür, insan olmanın en saf ve asil ortak dilidir."
    },
    {
      action: "Gün içinde zihninde 'Acaba yarın ne olacak?' kaygısı başladığı an, derin bir nefes al ve sadece önündeki 5 dakikaya odaklan.",
      because: "Çünkü gelecek henüz yaratılmamış bir hayaldir ve işlemcini geleceği simüle ederek yormak mantıksızlıktır. Güç, sadece şimdiki anın içindedir.",
      touch: "Bugün bir kez daha dene; cesaret, belirsizliğe rağmen yürümektir."
    },
    {
      action: "Bugün çok sevdiğin bir şeyi (bir yiyecek, bir alışkanlık vb.) canın en çok istediği an bilerek reddet ve iradeni test et.",
      because: "Çünkü dürtülerin kölesi olmak bilinci tamamen uyuşturur. Arzuyu bilerek askıya almak, merkezi işlemcinin (öz benliğinin) dürtülerden daha güçlü olduğunu sisteme kanıtlar.",
      touch: "Ödevim ve sorumluluğum, anlık her türlü arzudan üstündür."
    },
    {
      action: "Bugün akşam saatlerinde günün nasıl geçtiğini kağıt üzerinde tek bir kelime etmeden, sadece zihninde bir sinema şeridi gibi baştan sona izle.",
      because: "Çünkü gün içindeki eylemleri yargılamadan izlemek, bilincini bir üst gözlemci katmanına (Self) taşır. Bu, ruhun günlük hata ayıklama (debug) sürecidir.",
      touch: "Rüyalarım ve anılarım, ruhumun bana gönderdiği ham mesajlardır."
    }

,    {
      action: "Gün içinde biriyle konuşurken onun kusurlarını yakalayıp düzeltme isteğin uyandığı an bilerek sus ve içinden uyarılmayı reddet.",
      because: "Çünkü başkalarını sürekli düzeltme arzusu, kendi iç dünyandaki yetersizlik ve kontrol eksikliği korkularını bastırma çabasıdır.",
      touch: "Dünyayı hizaya sokmayı bırak, kendi merkezini hizala."
    },
    {
      action: "Bugün gardırobunu aç ve en az 1 yıldır hiç giymediğin, sadece bir gün giyerim diye tuttuğun 2 parça kıyafeti birine verilmek üzere ayır.",
      because: "Çünkü gelecekteki hayali ihtimallere tutunmak, şimdiki anın eksik olduğu illüzyonunu besler. Maddede sadeleşmek, zihinde eski bağları koparmaktır.",
      touch: "Geleceğin yüklerinden hafifledikçe gerçek gücün uyanır."
    },
    {
      action: "Gün içinde zihninde 'Herkes bana bakıyor' ya da 'Hata yaparsam ne düşünürler' baskısı hissettiğin an dur ve derin bir nefes al.",
      because: "Çünkü bu algı, egonun kendini dünyanın merkezi sanma illüzyonudur (spotlight etkisi). Gerçekte herkes kendi zihinsel hapishanesini izlemekle meşguldür.",
      touch: "Başkalarının hayali gözlerinden özgürleştiğinde, asıl hayatın başlar."
    },
    {
      action: "Bugün yürürken veya otururken gökyüzünün sonsuz derinliğine en az 1 dakika boyunca kırpmadan, sessizce bak.",
      because: "Çünkü gözlerini yatay düzlemden dikey düzleme çevirmek, gündelik küçük hesapların yarattığı zihinsel daralmayı kırar ve kozmik ritimle bağ kurmanı sağlar.",
      touch: "Gökyüzü senin en eski ve en berrak aynandır."
    },
    {
      action: "Bugün birinden bir övgü aldığında, tevazu maskesinin arkasına saklanıp konuyu geçiştirmeden, sadece gözlerine bakıp 'Teşekkür ederim' de.",
      because: "Çünkü övgüyü kibirlenmeden kabul edebilmek, içsel bütünlüğün ve kendi değerini başkalarının onayına ihtiyaç duymadan bilmenin bir göstergesidir.",
      touch: "Kendini küçültmek alçakgönüllülük değil, kendi gerçeğinden kaçmaktır."
    },
    {
      action: "Gün içinde çok önemsiz bir konuda bile olsa, içinden yükselen 'bunu haklı çıkarmalıyım' dürtüsünü fark ettiğin an tartışmayı bilerek kaybet.",
      because: "Çünkü egon için haklı olmak bir ölüm kalım savaşıdır. Bu savaşı bilerek bıraktığında, egonun sahte otoritesini kırar ve saf bilincin gücünü açığa çıkarırsın.",
      touch: "Haklı çıkmak seni büyütmez, sadece egonu şişirir."
    },
    {
      action: "Bugün yemek yerken, çalışırken veya yürürken tüm hareketlerini sanki ağır çekim bir filmdeymiş gibi yavaşlatarak gerçekleştir.",
      because: "Çünkü hız, bilincin uykuda olduğu andır. Eylemleri kasıtlı olarak yavaşlatmak, merkezi işlemcinin (farkındalığının) her saniyeyi tek tek işlemesini sağlar.",
      touch: "Hızlı yaşayanlar sadece hedefi görür, yavaşlayanlar ise yolun kendisi olur."
    },
    {
      action: "Bugün uzun zamandır konuşmadığın veya aramaya çekindiğin birini sadece onun hatırını sormak için doğrudan ara.",
      because: "Çünkü çekincelerin arkasında egonun 'reddedilirsem ne olur' korkusu saklıdır. Bu korkunun üzerine gitmek, bağ kurma protokolünü lokalde yeniden canlandırır.",
      touch: "Bir selam, bazen bin yıllık bir sessizliği tek saniyede eritir."
    },
    {
      action: "Gün içinde içinden birine karşı yoğun bir kıskançlık veya haset duygusu yükseldiğini fark ettiğin an dur ve o duyguya odaklan.",
      because: "Çünkü haset, karşındakinin başarısı değil; kendi içinde bastırdığın, henüz gerçekleştiremediğin potansiyelinin (gölgenin) sana fırlattığı sarsıcı bir uyarıdır.",
      touch: "Kıskandığın her insan, senin henüz yürüyemediğin potansiyelini gösterir."
    },
    {
      action: "Bugün yapacağın bir işi tamamladıktan sonra, sonucunu hiç kimseye gösterme, sosyal medyada paylaşma ve sadece kendine sakla.",
      because: "Çünkü dışarıdan gelecek takdir ve beğeni verisiyle beslenmek, eyleminin saf enerjisini kirletir. Kimsenin bilmediği başarı, içsel kaleni sarsılmaz kılar.",
      touch: "Gücünü dış dünyanın onay kırıntılarına muhtaç etme."
    },
    {
      action: "Bugün karşılaştığın ve seni zorlayan bir probleme karşı hemen panikle çözüm üretmeye çalışmayı bırak, sorunu sadece izle.",
      because: "Çünkü panik halinde üretilen her çözüm, eski korku kalıplarının (loop) tekrarından ibarettir. Sessizce beklediğinde, sistem en optimum veri yolunu kendisi bulur.",
      touch: "Çözüm, sorunun kendi içindeki sessizlik anında gizlidir."
    },
    {
      action: "Bugün zihninde sürekli 'Bunu yapamam' dediğin küçük bir inancını bul ve o inancın tam tersini bugün kasıtlı olarak eyleme dök.",
      because: "Çünkü zihnindeki kısıtlamalar gerçek değil, geçmişte yüklenmiş sahte kodlardır. Aksini yaptığında, sistem o sahte duvarı tamamen siler.",
      touch: "Sınırlar, sadece senin var olduğunu zannettiğin kalıplardır."
    },
    {
      action: "Bugün evinde veya iş yerinde en çok vakit geçirdiğin odanın pencerelerini aç ve en az 5 dakika boyunca sadece dışarıdaki rüzgarın sesini dinle.",
      because: "Çünkü kapalı alanlar zihinsel döngüleri daraltır. Dışarıdan gelen saf doğa frekansı, işlemcinin (bilincinin) üzerindeki statik elektriği topraklayarak temizler.",
      touch: "Doğanın sesi, ruhun kaybettiği asıl frekansıdır."
    },
    {
      action: "Bugün birisiyle konuşurken onun personalarını (maskelerini) izle ve onun aslında ne kadar incinebilir bir çocuk olduğunu fark et.",
      because: "Çünkü insanların sert veya kibirli duruşları, içlerindeki korkmuş çocuğu korumak için ürettikleri yapay zırhlardır. Bunu gördüğünde içindeki saf şifa katmanı uyanır.",
      touch: "Maskelerin arkasındaki çıplak insanı görmeyi öğren."
    },
    {
      action: "Bugün canını sıkan veya seni daraltan bir düşünce yakaladığında, o düşünceyi kağıda yaz ve sonra o kağıdı gözlerinin önünde tamamen yak.",
      because: "Çünkü soyut olan düşünceyi somut maddeye döküp yok etmek, bilinçaltına 'Bu veri kalıcı olarak silindi' sinyali gönderen devasa bir ritüeldir.",
      touch: "Kağıda dökülen her yük, bilincini biraz daha özgürleştirir."
    },
    {
      action: "Gün içinde içinden yükselen 'Ben her şeyi biliyorum' ya da 'Bu konuda en iyisi benim' hissini yakala ve o kibri bilerek ez.",
      because: "Çünkü bildiğini sanmak, sisteme yeni veri girişini tamamen kapatan en büyük hatadır. Cehaletini kabul ettiğin an bilgelik protokolü çalışır.",
      touch: "En büyük veri, henüz hiçbir şey bilmediğini kabul ettiğin an gelir."
    },
    {
      action: "Bugün yaptığın her eylemi (yürümek, yazmak, kapıyı açmak) sanki kutsal bir ritüelmiş gibi tam bir özen ve asaletle gerçekleştir.",
      because: "Çünkü sıradan eylemlere özen göstermek, bilinci günlük hayatın mekanikliğinden kurtarır ve yaşamı varoluşsal bir sanat eserine dönüştürür.",
      touch: "Asalet, yaptığın eylemin büyüklüğünde değil; onu nasıl yaptığında saklıdır."
    },
    {
      action: "Bugün birisinden bir talep veya istek geldiğinde, sırf ayıp olmasın diye evet demek yerine, içinden gelen o net 'Hayır'ı esnetmeden söyle.",
      because: "Çünkü başkalarına zoraki verdiğin her evet, kendi öz benliğine (Self) attığın sarsıcı bir hayır tokadıdır. Sınır koymak, kendine olan saygındır.",
      touch: "Sınırlarını net çizmeyenler, başkalarının hayat senaryosunda figüran olurlar."
    },
    {
      action: "Bugün gün boyunca karşılaştığın hiçbir olayı, insanı veya hava durumunu 'iyi' ya da 'kötü' diye etiketleme, sadece olduğu gibi kabul et.",
      because: "Çünkü zihnin dualite (ikilik) filtreleri, sürekli yargı üreterek enerjini tüketir. Yargıyı kestiğinde evrensel dengenin saf huzuru sisteme yüklenir.",
      touch: "Kabul teslimiyet değil; olanı olduğu gibi görebilme olgunluğudur."
    },
    {
      action: "Bugün zihninde geçmişten gelen bir intikam veya hesaplaşma sahnesi başladığı an, o sahneyi tam ortasında dondur ve tamamen sil.",
      because: "Çünkü geçmişin hayaletleriyle bugünün enerjisini harcayarak savaşmak, işlemciyi boş bir döngüde (infinite loop) kilitleyip tüketmektir.",
      touch: "Geçmişin borçlarını tahsil etmeye çalışmayı bırak, bugünün verisine odaklan."
    },
    {
      action: "Bugün bedeninde bir sızı veya rahatsızlık hissettiğinde, ondan nefret etmek yerine o bölgeye odaklan ve sadece nefes gönder.",
      because: "Çünkü beden, zihnin bastırdığı duyguları sana ağrı olarak raporlayan bir haberleşme birimidir. Onu dinlediğinde sistemdeki hata kodunu çözersin.",
      touch: "Bedenin yalan söylemez, o bilincinin maddesel dışa vurulmuş halidir."
    },
    {
      action: "Bugün günün bir anında telefonunu, bilgisayarını tamamen kapat ve 10 dakika boyunca gözlerini kapatıp karanlıkta kal.",
      because: "Çünkü modern veri akışı bilincini sürekli dışarıya doğru emer. Gözlerini kapatıp içeri döndüğünde, merkezi işlemcin (özün) kendini yeniler.",
      touch: "Dışarıya maske takanlar rüya görür, maskeyi indirip içeri bakanlar uyanır."
    },
    {
      action: "Bugün birisiyle konuşurken onun sözlerinin altındaki gizli manipülasyonu veya egosal tuzağı fark et ama ona belli etmeden sadece izle.",
      because: "Çünkü tuzakları görüp reaksiyon vermemek, karşındakinin egosal oyununu tek saniyede hükümsüz kılar ve kontrolü tamamen sana teslim eder.",
      touch: "Sarsılmayan sessiz duruş, en büyük ve en asil yanıttır."
    },
    {
      action: "Bugün zihninde 'Her şey çok kötü gidiyor' paniği başladığı an, şu an hayatta ve nefes alıyor olduğun gerçeğine tutun.",
      because: "Çünkü bu panik, zihnin gelecek simülasyonunda kaybolma hatasıdır. Aldığın nefes ise sistemin şu an sapasağlam çalıştığının en kesin verisidir.",
      touch: "Bu kesin bir veridir ki; nefes aldığın sürece sistem daima optimize edilebilir."
    },
    {
      action: "Bugün akşam yatağa girmeden önce, gün içinde yaşadığın en sarsıcı anı düşün ve 'Bu olay beni nasıl büyüttü?' sorusuna odaklan.",
      because: "Çünkü hayatta tesadüfi kriz yoktur. Yaşadığın her sarsıntı, senin eski ve katı olan derini atıp yenilenmen için tasarlanmış evrensel bir güncellemedir.",
      touch: "Dönüşüm sancılıdır ama eski kalıpları kırmanın tek ve sarsılmaz yoludur."
    }
,    {
      action: "Gün içinde bir başkasının hatasını veya açığını yakaladığında, bunu yüzüne vurma dürtünü bilerek ez ve sessiz kal.",
      because: "Çünkü başkalarının eksikliklerini ifşa etmek, egonun kendi kusurlarını gizlemek için kullandığı yapay bir üstünlük maskesidir.",
      touch: "Gerçek güç, başkalarının zayıflığını beslemeden kendi merkezinde kalabilmektir."
    },
    {
      action: "Bugün gardırobundan, çekmecenden veya mutfağından artık sana hiçbir faydası olmayan 3 nesneyi seç ve tamamen çöpe at veya birine ver.",
      because: "Çünkü maddesel dünyada biriktirdiğin her gereksiz veri, zihninde temizlenmemiş eski işlem logları gibi yer kaplar. Sadeleşmek, işlemciyi rahatlatmaktır.",
      touch: "Eski kalıpları ve fazlalıkları bırakmadan, yeni veri akışına yer açamazsın."
    },
    {
      action: "Bugün biriyle konuşurken içinden yükselen 'kendimi acındırma' veya 'ne kadar zorlandığımı anlatma' isteğini fark et ve o cümleyi hemen iptal et.",
      because: "Çünkü mağdur rolü oynamak, egonun çevreden sahte bir şefkat ve enerji emme taktiğidir. Bu kaçışı kestiğinde içindeki sarsılmaz irade uyanır.",
      touch: "Kendi gücünü, başkalarının acıma duygularına kurban etme."
    },
    {
      action: "Bugün akşam saatlerinde, odandaki tüm yapay ışıkları kapat ve tamamen karanlıkta, sadece nefesine odaklanarak 5 dakika kal.",
      because: "Çünkü yapay dünyadaki sürekli uyaran akışı bilincini dışarıya fırlatır. Karanlık ve sessizlik, sistemin fabrika ayarlarına (öz özüne) dönmesini sağlar.",
      touch: "Dışarıdaki gürültü kesilince, içerideki kadim ses konuşmaya başlar."
    },
    {
      action: "Bugün bir eylemi tamamladığında (yemeği bitirmek, bir işi teslim etmek vb.) hemen diğerine koşma, 2 dakika boyunca bomboş dur.",
      because: "Çünkü modern insan sürekli bir sonraki göreve atlayarak yaşar ve bilincini bir uyuşturucu gibi köreltir. Eylemler arasındaki boşluk, ruhun nefes aldığı andır.",
      touch: "Hayat, varış noktalarında değil; duraklardaki o kutsal boşluklarda gizlidir."
    },
    {
      action: "Bugün zihninde birisi hakkında 'O beni sevmiyor' ya da 'Bana karşı cephe aldı' şüphesi uyandığında, bu düşünceyi veri olarak kabul etmeyi reddet.",
      because: "Çünkü zihin, belirsizlik anlarında kendi korkularını (projeksiyon) başkalarının üzerine yansıtarak sahte düşmanlar yaratır. Bu sadece bir illüzyondur.",
      touch: "Başkalarının zihnini tahmin etmeye çalışarak kendi işlemcini yorma."
    },
    {
      action: "Bugün birisiyle konuşurken, onun sadece kelimelerini değil; ses tonundaki titremeleri, duraksamaları ve alt metni bir mühendis gibi analiz et.",
      because: "Çünkü insanlar kelimelerle sahte kimliklerini (persona) inşa ederler, ancak ses frekansı bastırılmış gölgeyi ele verir. Alt metni okumak gerçeği görmektir.",
      touch: "Kelimelerin arkasındaki o derin sessizliği duymayı öğren."
    },
    {
      action: "Bugün dışarıda yürürken adımlarının toprağa veya betona her basışında yerçekiminin gücünü ve ayak tabanındaki baskıyı net olarak hisset.",
      because: "Çünkü zihin sürekli soyut kaygılar dünyasında uçuşur. Bedeni yerçekimine sabitlemek, sistemin topraklama (grounding) yapmasını ve ana dönmesini sağlar.",
      touch: "Yaşadığın yer ve bedeninin ağırlığı, bilincini sabitleyen kaderindir."
    },
    {
      action: "Bugün zihninde 'keşke geçmişte şöyle yapsaydım' cümlesi başladığı an, o düşünceyi tam ortasında kes ve zihnini bugüne zorla çek.",
      because: "Çünkü pişmanlık, geçmişteki işlemci hatalarını bugünün enerjisini harcayarak boşta çalıştırma hatasıdır. Geçmiş bitti, sadece şu an optimize edilebilir.",
      touch: "Geçmişin hayaletleri, sen ona bugünün enerjisini vermediğinde yok olurlar."
    },
    {
      action: "Bugün uzun zamandır ertelediğin, seni içten içe huzursuz eden o zorlu telefon konuşmasını veya işi sabah ilk saatte tamamla.",
      because: "Çünkü gölgen (baskıladığın korkuların), sen kaçtıkça arkanda büyüyen bir gürültüye dönüşür. Üzerine gittiğin an o gölgenin yok olduğunu görürsün.",
      touch: "Ertelediğin her sorumluluk, sistemin arkasında sürekli ram tüketen bir kaçaktır."
    },
    {
      action: "Bugün bir işi veya davranışı yaparken içinden yükselen 'hızlı olmalıyım' baskısını fark et ve hızını kasıtlı olarak yarı yarıya düşür.",
      because: "Çünkü sürekli acele etmek, gelecekteki hayali bir ana yetişme kaygısıdır. Yavaşlamak, bilincin şimdiki zaman üzerindeki sarsılmaz kontrolünü sağlar.",
      touch: "Yavaşla, çünkü hayat sadece şu saniyenin içinde akıyor."
    },
    {
      action: "Bugün çevrendeki insanlardan birine, onun senden hiç beklemediği, tamamen çıkarsız ve gizli küçük bir kolaylık veya iyilik sağla.",
      because: "Çünkü karşılık bekleyerek yapılan her eylem egonun ticaretidir. Kimsenin bilmediği bir iyilik, egonun beslenme damarlarını keser ve ruhu özgürleştirir.",
      touch: "İyiliğin en saf hali, sağ elin verdiğini sol elin bilmediği zamandır."
    },
    {
      action: "Bugün birisi seni sertçe eleştirdiğinde veya hakkında olumsuz konuştuğunda savunmaya geçme, sadece dinle ve kafanı salla.",
      because: "Çünkü savunma mekanizması, egonun kırılgan maskesini koruma çabasıdır. Haklı çıkmaya çalışmadığında, eleştirinin seninle değil onunla ilgili olduğunu görürsün.",
      touch: "Sarsılmayan vakur duruş, dışarıdaki tüm yapay gürültüleri hükümsüz kılar."
    },
    {
      action: "Bugün hiç tanımadığın bir yabancıya (bir kurye, bir şoför vb.) gözlerinin tam içine bakarak içten ve samimi bir teşekkür ilet.",
      because: "Çünkü modern hayat insanı mekanikleştirir ve diğerlerini robot gibi görmene yol açar. Bağ kurduğunda, evrensel bütünlük protokolünü çalıştırmış olursun.",
      touch: "Bir teşekkür, insan olmanın en saf ve asil ortak dilidir."
    },
    {
      action: "Gün içinde içinden birini sertçe eleştirmek geçtiğinde, o eleştirinin aslında kendi içindeki hangi yarayı gizlediğini bul.",
      because: "Çünkü dışarıya fırlattığın her sert yargı, aslında kendi iç dünyanda henüz kabullenemediğin ve bastırdığın gölge taraflarının bir yansımasıdır.",
      touch: "Başkalarını yargılamak, kendini tanıma zahmetinden kaçmanın en kolay yoludur."
    },
    {
      action: "Bugün zihninde 'Acaba yarın ne olacak?' kaygısı başladığı an, derin bir nefes al ve sadece önündeki 5 dakikalık eylemine odaklan.",
      because: "Çünkü gelecek henüz yaratılmamış bir hayaldir ve işlemciyi simülasyonlarla yormak hatadır. Güç ve kontrol, sadece şimdiki anın içindedir.",
      touch: "Bugün bir kez daha dene; cesaret, belirsizliğe rağmen yürümektir."
    },
    {
      action: "Bugün çok istediğin bir konforunu veya alışkanlığını (bir kahve, bir sosyal medya turu vb.) canın en çok istediği an bilerek 1 saat askıya al.",
      because: "Çünkü dürtülerin kölesi olmak bilinci tamamen uyuşturur. Arzuyu bilerek durdurmak, merkezi işlemcinin (öz benliğinin) dürtülerden güçlü olduğunu kanıtlar.",
      touch: "Ödevim ve sorumluluğum, anlık her türlü arzudan her zaman üstündür."
    },
    {
      action: "Bugün karşılaştığın bir zorluk karşısında hemen şikayet etme dürtünü yakala ve ağzından çıkacak o negatif cümleyi yut.",
      because: "Çünkü şikayet etmek, çözüm enerjisini dışarıya gürültü olarak fırlatıp tüketmektir. Sustuğunda, o enerji içeride birikir ve eyleme dönüşür.",
      touch: "Gürültüyü kes, enerjini içerideki çözüme odakla."
    },
    {
      action: "Bugün aynaya baktığında sadece saçına veya kıyafetine değil, doğrudan kendi göz bebeklerinin içine 30 saniye boyunca kesintisiz bak.",
      because: "Çünkü aynada gördüğün şey dış dünyadır (persona). Gözlerin içine derinlemesine bakmak, o kabuğun arkasındaki gözlemci bilinci uyandırır.",
      touch: "Gördüğün beden bir giysidir, asıl olan arkadaki gözlemci bakıştır."
    },
    {
      action: "Bugün bir karar verirken 'Başkaları ne der?' düşüncesi zihnine sızdığı an, o düşünceyi yok say ve tamamen kendi bildiğini yap.",
      because: "Çünkü çevre odaklı yaşamak, kendi hayat yazılımının kontrolünü dışarıdaki rastgele sunuculara teslim etmektir. Kendi merkezinde kalmayı öğrenmelisin.",
      touch: "Her kararın, kendi içsel dünyan için sarsılmaz ve bağımsız bir yasa olmalıdır."
    },
    {
      action: "Bugün bedeninde kronik olarak gergin olan bir bölgeyi (genelde çene, boyun veya omuzlar) fark et ve derin bir nefesle tamamen gevşet.",
      because: "Çünkü zihindeki baskılanmış stres ve gölge duygular, bedende kas kasılması olarak depolanır. Bedeni gevşettiğinde bilinçaltındaki düğüm de gevşer.",
      touch: "Bedenin esnekliği, ruhun esnekliğinin dışa vurulmuş halidir."
    },
    {
      action: "Hayatında şu an yolunda gitmeyen bir durumu zorla düzeltmeye çalışmayı bırak ve bugün onu tamamen serbest bırak.",
      because: "Çünkü direndiğin şey varlığını sürdürmeye devam eder ve kontrol takıntısı insanı tüketir. Akışa teslim olmak kaybetmek değil, stratejik bir geri çekilmedir.",
      touch: "Kökü derinde olan ağaçlar, fırtınada esneyebilenlerdir."
    },
    {
      action: "Bugün yürürken veya otururken etrafındaki nesnelerin sadece renklerine ve dokularına odaklan, zihninin isim takmasını engelle.",
      because: "Çünkü zihin her şeyi etiketleyerek sıradanlaştırır ve insanı illüzyonlar dünyasında yaşatır. Etiketleri kaldırdığında kadim dünyanın saf gerçekliğiyle bağ kurarsın.",
      touch: "Farkındalık, sadece görmek değil; gördüğünü bilmektir."
    },
    {
      action: "Bugün birisinden bir talep veya istek geldiğinde, sırf ayıp olmasın diye evet demek yerine, içinden gelen o net 'Hayır'ı esnetmeden söyle.",
      because: "Çünkü başkalarına zoraki verdiğin her evet, kendi öz benliğine (Self) attığın sarsıcı bir hayır tokadıdır. Sınır koymak, kendine olan saygındır.",
      touch: "Sınırlarını net çizmeyenler, başkalarının hayat senaryosunda figüran olurlar."
    },
    {
      action: "Bugün akşam yatağa girmeden önce, gün içinde yaşadığın en sarsıcı anı düşün ve 'Bu olay beni nasıl büyüttü?' sorusuna odaklan.",
      because: "Çünkü hayatta tesadüfi kriz yoktur. Yaşadığın her sarsıntı, senin eski ve katı olan derini atıp yenilenmen için tasarlanmış evrensel bir güncellemedir.",
      touch: "Dönüşüm sancılıdır ama eski kalıpları kırmanın tek ve sarsılmaz yoludur."
    }
  ];
  const isClanComplete = REQUIRED_ARCHETYPES.every((id) =>
    friends.some((f) => f.archetype === id && f.status === "active"),
  );

  // 19 Nefertiti başlığı — her mesaj yenilendiğinde farklı biri seçilir
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

  const [dailyMessage, setDailyMessage] = useState<{
    message: string;
  } | null>(null);

  const [geminiQuotaError, setGeminiQuotaError] = useState(false);

  const [dayPhase, setDayPhase] = useState<
    "init" | "waiting" | "reading" | "done"
  >("init");
  const [dayScript, setDayScript] = useState<string[]>([]);

  const isGeminiDoneRef = useRef(false);
  const hasPlayedTitleRef = useRef(false);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const egyptAudioRef = useRef<HTMLAudioElement | null>(null);
  const [egyptPlaying, setEgyptPlaying] = useState<"none" | "part1" | "part2" | "completed">("none");
  const [activeEgyptPageId, setActiveEgyptPageId] = useState<string | null>(null);
  const [activeEgyptSectionIndex, setActiveEgyptSectionIndex] = useState(0);
  const [activeRosettaSectionIndex, setActiveRosettaSectionIndex] = useState(0);
  const egyptEndedListenerRef = useRef<(() => void) | null>(null);
  const currentViewRef = useRef(currentView);

  const cleanupEgyptAudio = () => {
    if (egyptAudioRef.current) {
      try {
        if (egyptEndedListenerRef.current) {
          egyptAudioRef.current.removeEventListener("ended", egyptEndedListenerRef.current);
        }
        egyptAudioRef.current.pause();
      } catch (e) {
        console.warn("cleanupEgyptAudio error:", e);
      }
      egyptAudioRef.current = null;
    }
    egyptEndedListenerRef.current = null;
  };

  useEffect(() => {
    currentViewRef.current = currentView;
    if (currentView !== "egypt_ancient") {
      cleanupEgyptAudio();
      setEgyptPlaying("none");
      setActiveEgyptPageId(null);
    }
    if (currentView !== "mesaj") {
      cleanupMesajAudio();
      setMesajSegmentIndex(-1);
    }
  }, [currentView]);

  useEffect(() => {
    if (
      currentView === "egypt_ancient" &&
      activeEgyptPageId === null &&
      egyptPlaying === "none"
    ) {
      handlePlayEgypt(true);
    }
  }, [currentView, activeEgyptPageId, egyptPlaying]);

  const checkDayNextPhase = () => {
    console.log(
      "checkDayNextPhase called - geminiDone:",
      isGeminiDoneRef.current,
      "currentView:",
      currentViewRef.current,
    );
    setDayPhase((prev) => {
      console.log("checkDayNextPhase prev state:", prev);
      if (
        isGeminiDoneRef.current &&
        prev === "waiting" &&
        currentViewRef.current === "index"
      ) {
        console.log("checkDayNextPhase advancing to done");
        return "done";
      }
      return prev;
    });
  };
  const [refreshSalt, setRefreshSalt] = useState(0);

  // Günün rastgele başlığını seç (gün bazında sabit kalsın diye tarih + salt kullan)
  const getDailyTitle = useCallback(() => {
    // Test amaçlı: localStorage'da __testDate varsa onu kullan
    const testDate = localStorage.getItem("__testDate");
    const today = testDate
      ? testDate
      : new Date().toISOString().split("T")[0];
    const hash = today + (refreshSalt || "");
    let idx = 0;
    for (let i = 0; i < hash.length; i++) {
      idx = (idx + hash.charCodeAt(i) * (i + 1)) % NEFERTITI_BASLIKLAR.length;
    }
    return NEFERTITI_BASLIKLAR[idx];
  }, [refreshSalt]);

  const [dailyTitle, setDailyTitle] = useState(getDailyTitle);

  // refreshSalt değişince başlığı yeniden seç
  useEffect(() => {
    setDailyTitle(getDailyTitle());
  }, [refreshSalt]);

  const [isMarqueePaused, setIsMarqueePaused] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<any>(null);
  const mesajAudioRef = useRef<HTMLAudioElement | null>(null);
  const mesajAudioEndedListenerRef = useRef<(() => void) | null>(null);
  const mesajAudioErrorListenerRef = useRef<((event: Event) => void) | null>(null);
  const mesajPlayVersionRef = useRef(0);
  const mesajTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mesajSegmentIndex, setMesajSegmentIndex] = useState(-1);

  useEffect(() => {
    if (mesajAudioRef.current) {
      mesajAudioRef.current.volume = volume;
    }
  }, [volume]);

  // Play mesajlar.mp3 with timing-based sentence sync
  // Her cümle ses ilerledikçe sırayla gösterilir, eski cümle kaybolur
  // Ses dosyası yüklenemezse fallback olarak zamanlayıcı ile cümleler gösterilir
  const playMesajAudio = () => {
    const playVersion = ++mesajPlayVersionRef.current;
    cleanupMesajAudio();

    if (mesajTimeoutRef.current) {
      clearTimeout(mesajTimeoutRef.current);
      mesajTimeoutRef.current = null;
    }

    setMesajSegmentIndex(0);
    setIsPlaying(true);

    // Ses dosyasını fetch ile önceden yükle (daha güvenilir)
    const loadAndPlay = async () => {
      try {
        const response = await fetch("/nasil.mp3");
        if (!response.ok) throw new Error("HTTP " + response.status);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (playVersion !== mesajPlayVersionRef.current) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        const audio = audioManager.play(blobUrl, { volume });
        mesajAudioRef.current = audio;

        // Sadece bu versiyon hala geçerliyse currentLocalAudio'ya ata
        if (playVersion === mesajPlayVersionRef.current && typeof window !== "undefined") {
          try {
            (window as any).currentLocalAudio = audio;
          } catch {}
        }

        let rafId: number;
        let isUnmounted = false;

        // Cümle bazlı timing hesapla
        const getTimings = (duration: number) => {
          const getWeight = (text: string) =>
            text.length + text.split(/[.,!?]/).length * 15;
          const weights = MESAJ_CUMLELERI.map((t) => getWeight(t));
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let cumulativeTime = 0;
          return weights.map((weight: number) => {
            const time = cumulativeTime;
            cumulativeTime += (weight / totalWeight) * duration;
            return time;
          });
        };

        const startPlayback = async () => {
          if (playVersion !== mesajPlayVersionRef.current) return;
          const timings = getTimings(audio.duration || 120); // fallback 120sn

          const checkTime = () => {
            if (isUnmounted || playVersion !== mesajPlayVersionRef.current) return;
            let newIndex = 0;
            for (let i = timings.length - 1; i >= 0; i--) {
              if (audio.currentTime >= timings[i]) {
                newIndex = i;
                break;
              }
            }
            setMesajSegmentIndex(newIndex);
            rafId = requestAnimationFrame(checkTime);
          };

          // Önce AudioContext'i unlock et (autoplay politikasını aşmak için)
          try {
            await unlockAudio();
          } catch {}
          
          // Kısa bir gecikme ile çalmayı dene
          await new Promise(r => setTimeout(r, 50));
          
          // Versiyon hala geçerli mi kontrol et
          if (playVersion !== mesajPlayVersionRef.current) return;
          
          audio.play().catch((e) => {
            console.warn("mesajlar.mp3 play failed:", e);
            // Ses çalamazsak fallback timer'a geç
            cancelAnimationFrame(rafId);
            cleanupMesajAudio();
            startFallbackTimer(playVersion);
          });
          rafId = requestAnimationFrame(checkTime);
        };

        // loadedmetadata + canplay + hemen başlat (hangisi önce tetiklenirse)
        let started = false;
        const tryStart = () => {
          if (started) return;
          started = true;
          startPlayback();
        };

        audio.addEventListener("loadedmetadata", tryStart, { once: true });
        audio.addEventListener("canplay", tryStart, { once: true });

        // Güvenlik timeout: 3 saniye sonra metadata gelmezse yine de dene
        mesajTimeoutRef.current = setTimeout(() => {
          if (!started && audio) {
            tryStart();
          }
        }, 3000);

        audio.addEventListener("ended", () => {
          if (playVersion !== mesajPlayVersionRef.current) return;
          cancelAnimationFrame(rafId);
          cleanupMesajAudio();
          setMesajSegmentIndex(MESAJ_CUMLELERI.length); // "Tamamlandı" göster
          setIsPlaying(false);
        });

        audio.addEventListener("error", () => {
          if (playVersion !== mesajPlayVersionRef.current) return;
          cancelAnimationFrame(rafId);
          cleanupMesajAudio();
          // Seste hata olursa fallback timer ile devam et
          startFallbackTimer(playVersion);
        });

        // Temizlik fonksiyonu
        return () => {
          isUnmounted = true;
          cancelAnimationFrame(rafId);
          if (mesajTimeoutRef.current) {
            clearTimeout(mesajTimeoutRef.current);
            mesajTimeoutRef.current = null;
          }
        };
      } catch (err) {
        console.warn("mesajlar.mp3 fetch/load error, starting fallback timer:", err);
        // Ses dosyası yüklenemezse fallback timer ile cümleleri göster
        startFallbackTimer(playVersion);
      }
    };

    // Fallback: ses olmadan zamanlayıcı ile cümleleri sırayla göster
    const startFallbackTimer = (version: number) => {
      if (version !== mesajPlayVersionRef.current) return;
      let idx = 0;
      setMesajSegmentIndex(0);
      setIsPlaying(true);

      const advance = () => {
        if (version !== mesajPlayVersionRef.current) return;
        idx++;
        if (idx >= MESAJ_CUMLELERI.length) {
          setMesajSegmentIndex(MESAJ_CUMLELERI.length); // "Tamamlandı"
          setIsPlaying(false);
          return;
        }
        setMesajSegmentIndex(idx);
        // Her cümle için ortalama 3 saniye (cümle uzunluğuna göre)
        const cümle = MESAJ_CUMLELERI[idx];
        const süre = Math.max(2000, cümle.length * 80 + 1500);
        mesajTimeoutRef.current = setTimeout(advance, süre);
      };

      // İlk cümleden sonra 2.5sn bekle, sonra sırayla devam et
      mesajTimeoutRef.current = setTimeout(advance, 2500);
    };

    loadAndPlay();
  };

  const cleanupMesajAudio = () => {
    if (mesajTimeoutRef.current) {
      clearTimeout(mesajTimeoutRef.current);
      mesajTimeoutRef.current = null;
    }
    if (mesajAudioRef.current) {
      try {
        mesajAudioRef.current.pause();
        mesajAudioRef.current.src = "";
      } catch (e) {
        console.warn("cleanupMesajAudio error:", e);
      }
      mesajAudioRef.current = null;
    }
    if (typeof window !== "undefined") {
      try {
        (window as any).currentLocalAudio = null;
      } catch {}
    }
  };

  // Klan sayfası için seslendirme scripti
  const klanScript = [
    "Arkadaşlarını davet et, klanını kur.",
    "Klanındaki her aktif üye için avantaj kazanırsın.",
    "Butona basınca rehberden kişi seç, listeye eklensin.",
    "Listeyi istediğin zaman kendin düzenleyebilirsin.",
    "Şimdi WhatsApp'tan davet gönder.",
  ];

  const isKlanMember = (f: { klanInvite?: boolean; archetype?: string }) =>
    !!f.klanInvite && !f.archetype;

  const klanListMembers = friends.filter(isKlanMember);

  const playKlanAudio = async () => {
    audioManager.onPageChange();
    await unlockAudio();
    const audio = audioManager.play("/klan.mp3", { volume });
    audio.playbackRate = 1.5; // ses hızını 1.5 kat artır
    (window as any).currentLocalAudio = audio;
    audio.onended = () => {
      if ((window as any).currentLocalAudio === audio) {
        setIsPlaying(false);
        (window as any).currentLocalAudio = null;
      }
    };
    setIsPlaying(true);
    audio.play().catch((e) => {
      console.warn("klan.mp3 play failed, falling back to TTS:", e);
      if ((window as any).currentLocalAudio === audio) {
        (window as any).currentLocalAudio = null;
      }
      setTimeout(() => {
        speakSentence(0, klanScript, "default");
      }, 50);
    });
  };

  const [showDuyBeniOverlay, setShowDuyBeniOverlay] = useState(false);
  const [showAlarmOverlay, setShowAlarmOverlay] = useState(false);
  const [isShadowRevealed, setIsShadowRevealed] = useState(false);
  const [alarmSound, setAlarmSound] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("alarm_sound") || "/klan.mp3"
      : "/klan.mp3",
  );
  const [overlayPermissionGranted, setOverlayPermissionGranted] = useState<boolean | null>(null);
  const [showOverlayPermissionModal, setShowOverlayPermissionModal] = useState(false);
  const [showAlarmSoundPicker, setShowAlarmSoundPicker] = useState(false);
  // Sallama ile tetikleme (Shake Gesture) sistemi
  const [shakeArmed, setShakeArmed] = useState(false); // Bildirim geldi, sallama bekle
  const [shakeTriggered, setShakeTriggered] = useState(false); // Sallama algılandı
  const shakeLastRef = useRef({ x: 0, y: 0, z: 0, lastTime: 0 });
  const shakeListenerRef = useRef(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const playVersionRef = useRef(0);
  const recognitionRef = useRef<any>(null);

  const initAudio = async () => {
    if (!audioContextRef.current) {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioContextRef.current = new AudioContextClass();
          gainNodeRef.current = audioContextRef.current.createGain();
          gainNodeRef.current.connect(audioContextRef.current.destination);
        } catch (e) {
          console.error("AudioContext creation failed:", e);
        }
      }
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      audioContextRef.current.resume().catch((e) => {
        console.error("AudioContext resume failed:", e);
      });
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    const fetchDaily = async () => {
      try {
        const res = await fetch("/daily_texts.json");
        if (res.ok) {
          const data = await res.json();
          if (data.jung && data.jung.length > 0) setJungTexts(data.jung);
          return data.unas && data.unas.length > 0 ? data.unas : null;
        }
      } catch (e) {
        console.error("Daily texts failed", e);
      }
      return null;
    };

    const fetchUnas = async (dailyUnas: string[] | null) => {
      try {
        const res = await fetch("/unas_texts.json");
        if (res.ok) {
          const data = await res.json();
          const allTexts = data.texts || [];
          console.log("Unas texts loaded:", allTexts.length);
          if (allTexts.length > 0) {
            setUnasAllTexts(allTexts);
            setUnasTexts(allTexts);
          } else if (dailyUnas) {
            setUnasAllTexts(dailyUnas);
            setUnasTexts(dailyUnas);
          }
        } else if (dailyUnas) {
          setUnasAllTexts(dailyUnas);
          setUnasTexts(dailyUnas);
        }
      } catch (e) {
        console.error("Unas texts failed", e);
        if (dailyUnas) {
          setUnasAllTexts(dailyUnas);
          setUnasTexts(dailyUnas);
        }
      }
    };

    const fetchOsmani = async () => {
      try {
        const res = await fetch("/osmani_texts.json");
        if (res.ok) {
          const data = await res.json();
          setOsmaniTexts(data.texts || []);
        }
      } catch (e) {
        // Optional file
      }
    };

    const loadAllData = async () => {
      const dailyUnas = await fetchDaily();
      fetchUnas(dailyUnas);
      fetchOsmani();
    };

    loadAllData();
  }, []);

  const [receivedShares, setReceivedShares] = useState<any[]>([]);
  const [sentShares, setSentShares] = useState<any[]>([]);

  const processedInviteAcceptsRef = useRef(new Set<string>());

  // Davet kabul edildi — listeye ekle (boş liste olsa bile)
  useEffect(() => {
    if (!user || receivedShares.length === 0) return;

    let updatedFriends = [...friendsRef.current];
    let changed = false;

    receivedShares.forEach((share) => {
      if (share.type !== "invite_accepted" || !share.inviteId) return;

      const acceptKey = `${share.inviteId}:${share.fromId}`;
      if (processedInviteAcceptsRef.current.has(acceptKey)) return;

      const byInviteId = updatedFriends.findIndex(
        (f) => f.id === share.inviteId,
      );
      const byUid = updatedFriends.findIndex(
        (f) => f.uid && f.uid === share.fromId,
      );
      const fIndex = byInviteId >= 0 ? byInviteId : byUid;

      if (fIndex >= 0) {
        if (updatedFriends[fIndex].status !== "active") {
          updatedFriends[fIndex].status = "active";
          changed = true;
        }
        if (share.fromName && updatedFriends[fIndex].name === "İsimsiz") {
          updatedFriends[fIndex].name = share.fromName;
          changed = true;
        }
        if (share.fromPhotoURL) {
          updatedFriends[fIndex].photoURL = share.fromPhotoURL;
          changed = true;
        }
        if (share.fromId && !updatedFriends[fIndex].uid) {
          updatedFriends[fIndex].uid = share.fromId;
          changed = true;
        }
        if (!updatedFriends[fIndex].klanInvite) {
          updatedFriends[fIndex].klanInvite = true;
          changed = true;
        }
      } else {
        updatedFriends.push({
          id: share.inviteId,
          uid: share.fromId,
          name: share.fromName || "İsimsiz",
          phone: "",
          klanInvite: true,
          status: "active",
          invitedAt: Date.now(),
          photoURL: share.fromPhotoURL || "",
          inviterUid: user.uid,
        });
        changed = true;
      }

      processedInviteAcceptsRef.current.add(acceptKey);
    });

    if (changed) {
      friendsRef.current = updatedFriends;
      setFriends(updatedFriends);
      updateDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        friends: updatedFriends,
        updatedAt: serverTimestamp(),
      }).catch((e) => console.error("[KLAN] friends güncellenemedi:", e));
    }
  }, [user, receivedShares]);

  useEffect(() => {
    if (!user) return;

    // Received Messages
    const qReceived = query(
      collection(db, "shares"),
      where("toId", "==", user.uid),
    );
    const unsubscribeReceived = onSnapshot(
      qReceived,
      (snapshot) => {
        const shares = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReceivedShares(
          shares.sort(
            (a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds,
          ),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "shares");
      },
    );

    // Sent Messages
    const qSent = query(
      collection(db, "shares"),
      where("fromId", "==", user.uid),
    );
    const unsubscribeSent = onSnapshot(
      qSent,
      (snapshot) => {
        const shares = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSentShares(
          shares.sort(
            (a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds,
          ),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "shares");
      },
    );

    return () => {
      unsubscribeReceived();
      unsubscribeSent();
    };
  }, [user]);

  // URL parametrelerini giriş öncesi sakla
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviterUid = params.get("inviter");
    const inviteId = params.get("inviteId");
    if (inviterUid && inviteId) {
      sessionStorage.setItem(
        "pendingKlanInvite",
        JSON.stringify({ inviterUid, inviteId }),
      );
    }
  }, []);

  // URL Invite Check
  useEffect(() => {
    console.log("[DEBUG INVITE] URL params:", window.location.search, "user:", !!user);
    if (!user) {
      console.log("[DEBUG INVITE] No user logged in - invite will NOT be processed");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    let inviterUid = params.get("inviter");
    let inviteId = params.get("inviteId");

    if (!inviterUid || !inviteId) {
      const pending = sessionStorage.getItem("pendingKlanInvite");
      if (pending) {
        try {
          const parsed = JSON.parse(pending);
          inviterUid = parsed.inviterUid;
          inviteId = parsed.inviteId;
        } catch {
          sessionStorage.removeItem("pendingKlanInvite");
        }
      }
    }

    const kankaParam = params.get("kanka");
    console.log("[DEBUG INVITE] inviter:", inviterUid, "inviteId:", inviteId, "kanka:", kankaParam, "user.uid:", user.uid);

    if (inviterUid && inviteId && user.uid !== inviterUid) {
      console.log("[DEBUG INVITE] Valid invite detected! Processing acceptance...");
      const acceptedKey = `accepted_${inviteId}`;
      if (!localStorage.getItem(acceptedKey)) {
        localStorage.setItem(acceptedKey, "true");
        sessionStorage.removeItem("pendingKlanInvite");
        const acceptShare = async () => {
          try {
            await addDoc(collection(db, "shares"), {
              type: "invite_accepted",
              fromId: user.uid,
              toId: inviterUid,
              inviteId: inviteId,
              fromName: user.displayName || "İsimsiz",
              fromPhotoURL: user.photoURL || "",
              createdAt: serverTimestamp(),
            });
            alert("Bilinç Halkasına katıldınız!");
          } catch (e) {
            console.error("Could not accept invite", e);
            alert("Davet kabul edilemedi. Lütfen tekrar deneyin.");
          }
        };
        acceptShare();
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        const userDoc = await getDoc(doc(db, "users", authUser.uid));
        if (userDoc.exists()) {
          setFriends(userDoc.data().friends || []);
        } else {
          await setDoc(doc(db, "users", authUser.uid), {
            uid: authUser.uid,
            displayName: authUser.displayName,
            friends: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const saveFriendsToFirestore = async (newFriends: typeof friends) => {
    friendsRef.current = newFriends;
    setFriends(newFriends);
    // Kullanıcı giriş yapmış olsun veya olmasın, her durumda Firestore'a kaydet
    const docId = user?.uid || `device_${localStorage.getItem("deviceId") || (() => { const id = "device_" + Date.now() + "_" + Math.random().toString(36).slice(2); localStorage.setItem("deviceId", id); return id; })()}`;
    try {
      await updateDoc(doc(db, "users", docId), {
        uid: docId,
        friends: newFriends,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      // Eğer doküman yoksa setDoc ile oluştur
      try {
        await setDoc(doc(db, "users", docId), {
          uid: docId,
          friends: newFriends,
          updatedAt: serverTimestamp(),
        });
      } catch (setError) {
        handleFirestoreError(setError, OperationType.UPDATE, `users/${docId}`);
      }
    }
  };

  const removeKlanMember = async (id: string) => {
    if (!user) return;
    await saveFriendsToFirestore(
      friendsRef.current.filter((f) => f.id !== id),
    );
  };

  const updateFriends = async (newFriends: any[]) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        friends: newFriends,
        updatedAt: serverTimestamp(),
      });
      setFriends(newFriends);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const [addingToArchetype, setAddingToArchetype] = useState<string | null>(
    null,
  );

  const addFriendToArchetype = (archId: string) => {
    if (!newFriendName.trim()) return;
    const newFriend = {
      id: Math.random().toString(36).substr(2, 9),
      name: newFriendName,
      phone: newFriendPhone,
      archetype: archId,
      status: "pending",
      invitedAt: Date.now(),
    };
    updateFriends([...friends, newFriend]);
    setNewFriendName("");
    setNewFriendPhone("");
    setAddingToArchetype(null);
  };

  const removeFriend = (id: string) => {
    const updated = friends.filter((f) => f.id !== id);
    updateFriends(updated);
  };

  const importFromContactsToArchetype = async (archId: string) => {
    if (!("contacts" in navigator && "select" in (navigator as any).contacts)) {
      alert("Rehberden kişi seçme özelliği bu tarayıcıda desteklenmiyor.");
      return;
    }

    try {
      const props = ["name", "tel"];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);

      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const name = contact.name?.[0] || "İsimsiz";
        const phone = contact.tel?.[0] || "";

        const newFriend = {
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          phone: phone,
          archetype: archId,
          status: "pending",
          invitedAt: Date.now(),
        };
        updateFriends([...friends, newFriend]);
        setAddingToArchetype(null);
      }
    } catch (err) {
      console.error("Rehber erişimi reddedildi", err);
    }
  };

  const sendWhatsAppInviteForFriend = (friend: any) => {
    const inviteLink = `https://ais-pre-ngabp2fbp7efhov5ibvzfd-518264936902.europe-west2.run.app?inviter=${user?.uid}&inviteId=${friend.id}&isim=${encodeURIComponent(user?.displayName || localName || "İsimsiz")}`;
    const archetype = EGYPTIAN_ARCHETYPES.find(
      (a) => a.id === friend.archetype,
    );
    const davetImageUrl = `${window.location.origin}/klan0.png`;
    let message = `Selam ${friend.name},\n\nSenin için özel bir davetiyem var! 🎴\n${davetImageUrl}\n\n`;
    if (archetype) {
      message += `${archetype.message}\n\n`;
    }
    message += `Katılmak için tıkla: ${inviteLink}`;

    // Construct WhatsApp link
    let phoneParam = "";
    if (friend.phone) {
      const justNum = friend.phone.replace(/\D/g, "");
      if (justNum.length > 5) {
        phoneParam = `phone=${justNum}&`;
      }
    }
    const waUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  const sendWhatsAppInvite = () => {
    if (!user) return;
    const inviteLink = `https://ais-pre-ngabp2fbp7efhov5ibvzfd-518264936902.europe-west2.run.app?kanka=${user.uid}&isim=${encodeURIComponent(user.displayName || localName || "İsimsiz")}`;
    const inviteText = `Selam! Rüyaların ve kadim bilgeliğin dünyasını keşfettiğim bir uygulama buldum: Unas & Jung. Benim Bağlantılar listeme eklenmek ve bana uygulama içinden mesaj göndermek için bu linke tıkla:\n\n${inviteLink}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(inviteText)}`,
      "_blank",
    );
  };

  const sendWhatsAppInviteForArchetype = async (
    archetypeId: string,
    archetypeName: string,
  ) => {
    if (!user) return;

    const friendId =
      friends.find((f) => f.archetype === archetypeId)?.id ||
      `invite_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const newFriend = {
      id: friendId,
      archetype: archetypeId,
      status: "pending",
      invitedAt: Date.now(),
      name: archetypeName,
      phone: "",
    };

    const newFriends = [
      ...friends.filter(
        (f) => f.id !== friendId && f.archetype !== archetypeId,
      ),
      newFriend,
    ];
    setFriends(newFriends);
    await updateDoc(doc(db, "users", user.uid), { uid: user.uid, friends: newFriends, updatedAt: serverTimestamp() }).catch(
      console.error,
    );

    const inviteLink = `https://ais-pre-ngabp2fbp7efhov5ibvzfd-518264936902.europe-west2.run.app?inviter=${user.uid}&inviteId=${friendId}&isim=${encodeURIComponent(user.displayName || localName || "İsimsiz")}`;
    const inviteText = `Selam! 👁 İçsel dünyanın ve rüyalarının rehberliğinde kendi mitini keşfetmek ister misin? Seni kendi klanıma, kadim bilgelik öğretilerinde ${archetypeName} rolüyle dâhil olmaya davet ediyorum. Kadim sırlar uyanıyor. Benimle bu yola çıkmak için aşağıdaki gizli bağlantıya tıkla:\n\n${inviteLink}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(inviteText)}`,
      "_blank",
    );
  };

  const copyInviteLink = () => {
    if (!user) return;
    const inviteLink = `https://ais-pre-ngabp2fbp7efhov5ibvzfd-518264936902.europe-west2.run.app?kanka=${user.uid}&isim=${encodeURIComponent(user.displayName || localName || "İsimsiz")}`;
    const inviteText = `Selam! Unas & Jung uygulamasına katıl ve bağlantılarıma eklen:\n\n${inviteLink}`;
    navigator.clipboard.writeText(inviteText);
    alert("Davet linki kopyalandı.");
  };

  // Klan davet linki ve WhatsApp paylaşımı

  const getInviteBaseUrl = () =>
    typeof window !== "undefined"
      ? window.location.origin
      : "https://ais-pre-ngabp2fbp7efhov5ibvzfd-518264936902.europe-west2.run.app";

  const openWhatsAppKlanInvite = (
    name: string,
    phone: string,
    friendId: string,
    displayName: string,
    uid: string,
  ) => {
    const inviteLink = `${getInviteBaseUrl()}?inviter=${uid}&inviteId=${friendId}&isim=${encodeURIComponent(displayName)}`;
    const davetImageUrl = `${window.location.origin}/klan0.png`;
    const greeting = name && name !== "İsimsiz" ? `Selam ${name}! 👋` : "Selam! 👋";
    const message = `${greeting}\n\nSeni özel bir davetiyem var! 🎴\n${davetImageUrl}\n\nKatılmak için tıkla: ${inviteLink}`;

    let phoneParam = "";
    if (phone) {
      const justNum = phone.replace(/\D/g, "");
      if (justNum.length > 5) {
        phoneParam = `phone=${justNum}&`;
      }
    }
    const waUrl = phoneParam
      ? `https://web.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  };

  // WhatsApp davet — önce rehber/fihrist, sonra listeye ekle ve WhatsApp aç
  const handleSendKankInvite = useCallback(async () => {
    const uid = user?.uid || "anon_" + Date.now();
    const displayName = user?.displayName || localName || "İsimsiz";

    const createInviteId = (index = 0) =>
      `klan_${Date.now()}_${index}_${Math.random().toString(36).slice(2)}`;

    const persistKlanInvites = (newEntries: typeof friends) => {
      const newFriends = [...friendsRef.current, ...newEntries];
      saveFriendsToFirestore(newFriends);
      return newFriends;
    };

    const tryContactsAPI = async (): Promise<boolean> => {
      if (!("contacts" in navigator && "select" in (navigator as any).contacts)) {
        return false;
      }
      try {
        const props = ["name", "tel"];
        const opts = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, opts);

        if (!contacts || contacts.length === 0) return true;

        const newEntries: typeof friends = contacts.map(
          (contact: any, index: number) => {
            const name = contact.name?.[0] || "İsimsiz";
            const phone = contact.tel?.[0] || "";
            return {
              id: createInviteId(index),
              name,
              phone,
              klanInvite: true,
              status: "pending" as const,
              invitedAt: Date.now(),
              inviterUid: uid,
            };
          },
        );

        persistKlanInvites(newEntries);

        newEntries.forEach((entry) => {
          openWhatsAppKlanInvite(
            entry.name,
            entry.phone,
            entry.id,
            displayName,
            uid,
          );
        });
        return true;
      } catch (err) {
        console.warn("Rehber seçimi iptal edildi veya başarısız:", err);
        return false;
      }
    };

    const usedContacts = await tryContactsAPI();
    if (usedContacts) return;

    // Contacts API desteklenmiyorsa direkt WhatsApp Web davet linki aç
    const inviteLink = `${getInviteBaseUrl()}?inviter=${uid}&inviteId=${createInviteId()}&isim=${encodeURIComponent(displayName)}`;
    const davetImageUrl = `${window.location.origin}/klan0.png`;
    const message = `Selam! 👋\n\nSeni özel bir davetiyem var! 🎴\n${davetImageUrl}\n\nKatılmak için tıkla: ${inviteLink}`;
    const waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  }, [user, localName]);

  const handleNativeShare = async () => {
    if (!shareTarget) return;
    const text =
      shareTarget.type === "daily"
        ? shareTarget.content.synthesis
        : shareTarget.type === "dream"
          ? shareTarget.content.interpretation
          : shareTarget.content.answer.text;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Unas & Jung Rehberliği",
          text: text,
          url: "https://ais-pre-ngabp2fbp7efhov5ibvzfd-518264936902.europe-west2.run.app",
        });
      } catch (err) {
        console.error("Native share failed", err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("Mesaj panoya kopyalandı. İstediğin yerde paylaşabilirsin.");
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareTarget) return;
    const text =
      shareTarget.type === "daily"
        ? shareTarget.content.synthesis
        : shareTarget.type === "dream"
          ? shareTarget.content.interpretation
          : shareTarget.content.answer.text;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleShareToFriend = async (friend: any) => {
    if (!user || !shareTarget) return;
    try {
      await addDoc(collection(db, "shares"), {
        fromId: user.uid,
        toId: friend.id,
        toName: friend.name,
        type: shareTarget.type,
        content: shareTarget.content,
        createdAt: serverTimestamp(),
      });
      alert(`${friend.name} kişisine başarıyla gönderildi.`);
      setShowShareModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "shares");
    }
  };

  const getDailyMessage = async (salt = 0) => {
    console.log(
      "getDailyMessage starting with salt:",
      salt,
      "unasTexts:",
      unasTexts.length,
      "jungTexts:",
      jungTexts.length,
    );

    // === OPTION A: Önceden üretilmiş mesajı kontrol et ===
    // Kullanıcı dün mesajı okuduğunda, bugünün mesajı önceden üretilip localStorage'a kaydedilmiş olabilir.
    // NOT: Eğer salt > 0 (refresh) veya testDateOffset varsa, önceden üretilmiş mesajı atla
    // çünkü kullanıcı test yapıyor demektir.
    let hasTestOffset = false;
    try {
      const stored = localStorage.getItem("testDateOffset");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed !== 0) hasTestOffset = true;
      }
    } catch {}
    // __testDate varsa da önceden üretilmiş mesajı atla
    const hasTestDate = !!localStorage.getItem("__testDate");
    const skipPreGen = salt > 0 || hasTestOffset || hasTestDate;

    if (!skipPreGen) {
      const testDate = localStorage.getItem("__testDate");
      const todayDateStr = testDate
        ? new Date(testDate + "T12:00:00").toLocaleDateString("tr-TR")
        : new Date().toLocaleDateString("tr-TR");
      try {
        const preGenRaw = localStorage.getItem("preGeneratedMessage");
        if (preGenRaw) {
          const preGen = JSON.parse(preGenRaw);
          if (preGen.date === todayDateStr && preGen.message) {
            // Eski format kontrolü: eski formatta message bir string değil, 6 alanlı bir objeydi
            // { ancientSymbol, ancientMeaning, jungNote, shadowReveal, modernBridge, dailyAction }
            // Yeni formatta message: string (direkt mesaj metni)
            if (typeof preGen.message === "string") {
              console.log("Using pre-generated message for today:", todayDateStr);
              setDailyMessage({ message: preGen.message });
              setDayPhase("done");
              isGeminiDoneRef.current = true;
              return; // Önceden üretilmiş mesaj var, normal akışa gerek yok
            }
            // Eski format (6 alanlı obje) ise yok say ve yeniden üret
            console.warn("Pre-generated message is in old format, ignoring and regenerating");
            localStorage.removeItem("preGeneratedMessage");
          }
        }
      } catch (e) {
        console.warn("Pre-generated message check failed:", e);
      }
    }

    // === YENİ: localStorage'dan selectedIndices ve keyword oku ===
    const { seed: detSeed } = getDeterministicSelection();
    // salt'ı da seed'e ekle (yenileme için)
    // 7919 asal sayısı ile çarparak her refresh'te seed'in büyük sıçramasını sağla
    const finalSeed = detSeed + salt * 7919;

    // === TEKRAR ÖNLEME: Son 7 günün kombinasyonlarını localStorage'dan oku ===
    // Aynı eylem+hedef+gerekçe kombinasyonu tekrar seçilmesin
    let skipCombinations: string[] = [];
    try {
      const historyRaw = localStorage.getItem("messageHistory");
      if (historyRaw) {
        const history = JSON.parse(historyRaw);
        if (Array.isArray(history)) {
          skipCombinations = history.map((h: any) => h.combination).filter(Boolean);
        }
      }
    } catch (e) {
      console.warn("Message history read failed:", e);
    }

    // === YENİ AKIŞ: Sadece local algoritma (AI kaldırıldı) ===
    // AI (Gemini) sürekli aynı mesajı üretiyordu. Kullanıcı isteği üzerine kaldırıldı.
    console.log("Using local message generation, seed:", finalSeed);
    const localMsg = generateLocalMessage(finalSeed, unasTexts, jungTexts, skipCombinations);
    setDailyMessage(localMsg);
    setDayPhase("done");
    isGeminiDoneRef.current = true;

    // === TEKRAR ÖNLEME: Bugünün kombinasyonunu geçmişe ekle ===
    // localStorage'da son 7 günlük geçmiş tutulur
    try {
      const historyRaw = localStorage.getItem("messageHistory");
      let history: Array<{ date: string; combination: string }> = [];
      if (historyRaw) {
        history = JSON.parse(historyRaw);
        if (!Array.isArray(history)) history = [];
      }
      // Bugünün kombinasyonunu çıkar (eylem|hedef|gerekce)
      // localMsg.message'dan eylem+hedef+gerekce'yi çıkaramayız çünkü sadece mesaj metni var
      // Ama generateLocalMessage içinde zaten skipSet ile kontrol edildi
      // Burada sadece tarih bazlı temizlik yapalım
      const todayStr = new Date().toLocaleDateString("tr-TR");
      // 7 günden eski kayıtları temizle
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      history = history.filter((h) => {
        try {
          const hDate = new Date(h.date.split(".").reverse().join("-"));
          return hDate >= sevenDaysAgo;
        } catch { return false; }
      });
      // Bugün için kayıt varsa güncelle, yoksa ekle
      const existingIdx = history.findIndex((h) => h.date === todayStr);
      if (existingIdx >= 0) {
        history[existingIdx] = { date: todayStr, combination: localMsg.message };
      } else {
        history.push({ date: todayStr, combination: localMsg.message });
      }
      localStorage.setItem("messageHistory", JSON.stringify(history));
    } catch (e) {
      console.warn("Message history save failed:", e);
    }

    // === OPTION A: Bir sonraki günün mesajını önceden üret ===
    // Kullanıcı bugünkü mesajı okuduğunda, yarının mesajını da hesaplayıp localStorage'a kaydet.
    // Böylece yarın sabah 03:00'te uygulama kapalı olsa bile mesaj hazır olur.
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDaySinceEpoch = Math.floor(
        tomorrow.getTime() / (1000 * 60 * 60 * 24)
      );
      const tomorrowSeed = detSeed - Math.floor(Date.now() / (1000 * 60 * 60 * 24)) + tomorrowDaySinceEpoch;
      const tomorrowMsg = generateLocalMessage(tomorrowSeed, unasTexts, jungTexts);
      const tomorrowDateStr = tomorrow.toLocaleDateString("tr-TR");

      // Yarının başlığını da aynı seed mantığıyla seç (getDailyTitle mantığıyla uyumlu)
      const tomorrowHash = tomorrow.toISOString().split("T")[0] + (refreshSalt || "");
      let tomorrowTitleIdx = 0;
      for (let i = 0; i < tomorrowHash.length; i++) {
        tomorrowTitleIdx = (tomorrowTitleIdx + tomorrowHash.charCodeAt(i) * (i + 1)) % NEFERTITI_BASLIKLAR.length;
      }
      const secilenDinamikBaslik = NEFERTITI_BASLIKLAR[tomorrowTitleIdx].text;

      // Yeni formatta message, title ve targetDayIndex ile kaydedilir
      localStorage.setItem("preGeneratedMessage", JSON.stringify({
        date: tomorrowDateStr,
        message: tomorrowMsg.message,
        title: secilenDinamikBaslik,
        targetDayIndex: tomorrowDaySinceEpoch,
      }));
      console.log("Pre-generated tomorrow's message:", tomorrowDateStr, "title:", secilenDinamikBaslik);
    } catch (e) {
      console.warn("Pre-generation failed (non-critical):", e);
    }
  };

  // Günlük mesaj başlık sesini çal (bXX.mp3) — sadece bir kere çalışır
  const playDailyAudio = useCallback(async () => {
    if (hasPlayedTitleRef.current) return;

    setIsPlaying(true);
    setDayPhase("playing");

    const titleAudio = audioManager.play(dailyTitle.audio, { volume });
    titleAudio.preload = "auto";
    
    // Önceki sesi durdur ve yenisiyle değiştir
    if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
      try {
        (window as any).currentLocalAudio.pause();
      } catch (e) {}
    }
    (window as any).currentLocalAudio = titleAudio;

    titleAudio.onended = () => {
      if ((window as any).currentLocalAudio === titleAudio) {
        hasPlayedTitleRef.current = true;
        setIsPlaying(false);
        setDayPhase("done");
      }
    };
    titleAudio.onerror = () => {
      console.warn("Başlık sesi yüklenemedi");
      if ((window as any).currentLocalAudio === titleAudio) {
        hasPlayedTitleRef.current = true;
        setIsPlaying(false);
        setDayPhase("done");
      }
    };

    // play() Promise'ini bekle, hata olursa tekrar dene
    try {
      await titleAudio.play();
      hasPlayedTitleRef.current = true;
    } catch (e) {
      console.warn("Başlık sesi çalınamadı, 500ms sonra tekrar deneniyor:", e);
      await new Promise(r => setTimeout(r, 500));
      try {
        await titleAudio.play();
        hasPlayedTitleRef.current = true;
      } catch (e2) {
        console.warn("Başlık sesi ikinci denemede de çalınamadı:", e2);
        // hasPlayedTitleRef true YAPILMAZ — autoplay engeli olabilir,
        // kullanıcı etkileşimi ile tekrar denenmeli
        // dayPhase "playing" olarak kalır, mesaj içeriği gizlenir
        setIsPlaying(false);
        // setDayPhase("done") YAPILMAZ — kullanıcı tıklayınca ses çalana kadar bekle
      }
    }
  }, [dailyTitle, volume]);

  // Index sayfası için başlık sesini (bXX.mp3) çalar
  // Sadece mesaj hazır olduğunda (dayPhase === "done") çağrılır
  const playIndexAudio = useCallback(async () => {
    setIsPlaying(true);

    // Başlık sesini çal (bXX.mp3)
    const titleAudio = audioManager.play(dailyTitle.audio, { volume });
    titleAudio.preload = "auto";
    
    // Önceki sesi durdur ve yenisiyle değiştir
    if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
      try {
        (window as any).currentLocalAudio.pause();
      } catch (e) {}
    }
    (window as any).currentLocalAudio = titleAudio;

    titleAudio.onended = () => {
      if ((window as any).currentLocalAudio === titleAudio) {
        setIsPlaying(false);
      }
    };
    titleAudio.onerror = () => {
      console.warn("Index başlık sesi yüklenemedi");
      if ((window as any).currentLocalAudio === titleAudio) {
        setIsPlaying(false);
      }
    };

    try {
      await titleAudio.play();
    } catch (e) {
      console.warn("Index başlık sesi çalınamadı, 500ms sonra tekrar deneniyor:", e);
      await new Promise(r => setTimeout(r, 500));
      try {
        await titleAudio.play();
      } catch (e2) {
        console.warn("Index başlık sesi ikinci denemede de çalınamadı:", e2);
        setIsPlaying(false);
      }
    }
  }, [dailyTitle, volume]);

  useEffect(() => {
    setDailyMessage(null);
    setIsShadowRevealed(false);
    setDayPhase("init");
    // Cümle seçimleri değişince başlık da değişsin — refreshSalt'i artır
    setRefreshSalt((prev) => prev + 1);
  }, [selectedIndices]);

  // Index sayfasında mesaj hazır olunca (dayPhase === "done") başlık sesini çalmak için ref
  const hasPlayedIndexAudioRef = useRef(false);

  useEffect(() => {
    console.log("DAILYMSG EFFECT: view=", currentView, "dailyMessage=", !!dailyMessage, "dayPhase=", dayPhase);
    if (currentView === "index") {
      if (!dailyMessage && dayPhase === "init") {
        console.log("DAILYMSG EFFECT: calling getDailyMessage");
        getDailyMessage(refreshSalt);
      }

      // Mesaj hazır olduğunda (dayPhase === "done") başlık sesini çal
      if (dayPhase === "done" && !hasPlayedIndexAudioRef.current) {
        hasPlayedIndexAudioRef.current = true;
        
        // Önce unlockAudio ile AudioContext'i resume et
        unlockAudio().then(() => {
          // Sonra sessiz audio ile tarayıcı autoplay politikasını aşmayı dene
          return audioManager.unlockAudio();
        }).then(() => {
          // Sessiz audio başarılı oldu, şimdi asıl sesi çal
          playIndexAudio();
        }).catch(() => {
          // Autoplay hala engelleniyor — alternatif yöntemler dene
          
          // 1) visibilitychange: kullanıcı başka sekmeye gidip gelince dene
          const visHandler = () => {
            if (!document.hidden) {
              document.removeEventListener('visibilitychange', visHandler);
              playIndexAudio();
            }
          };
          document.addEventListener('visibilitychange', visHandler);
          
          // 2) Kullanıcının ilk tıklamasında çal
          const clickHandler = () => {
            document.removeEventListener('click', clickHandler);
            document.removeEventListener('touchstart', clickHandler);
            document.removeEventListener('visibilitychange', visHandler);
            playIndexAudio();
          };
          document.addEventListener('click', clickHandler, { once: true });
          document.addEventListener('touchstart', clickHandler, { once: true });
          
          // 3) 3 saniye sonra tekrar dene (bazı tarayıcılar load'dan kısa süre sonra izin verir)
          setTimeout(() => {
            document.removeEventListener('visibilitychange', visHandler);
            document.removeEventListener('click', clickHandler);
            document.removeEventListener('touchstart', clickHandler);
            audioManager.unlockAudio().then(() => {
              playIndexAudio();
            }).catch(() => {
              // Hala olmazsa, ses çalamayacağız demektir — sessizce bekle
              console.warn("Index audio could not be played after all attempts");
            });
          }, 3000);
        });
      }
    } else {
      // Başka sayfaya geçince ref'i sıfırla ki geri dönüşte tekrar çalsın
      hasPlayedIndexAudioRef.current = false;
    }
  }, [currentView, dailyMessage, dayPhase, refreshSalt, unasTexts, jungTexts]);


  const stopAudio = () => {
    playVersionRef.current++;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    cleanupEgyptAudio();
    cleanupMesajAudio();
    setEgyptPlaying("none");
    if (currentSourceRef.current) {
      if (currentSourceRef.current.onended)
        currentSourceRef.current.onended = null;
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
      try {
        (window as any).currentLocalAudio.pause();
        (window as any).currentLocalAudio.currentTime = 0;
      } catch (e) {}
      (window as any).currentLocalAudio = null;
    }

    currentUtteranceRef.current = null;
    setIsPlaying(false);
  };

  const handlePlayEgypt = async (force: boolean = false) => {
    if (!force && (egyptPlaying === "part1" || egyptPlaying === "part2")) return;
    // First, pause any existing egypt audios and remove listeners safely
    cleanupEgyptAudio();
    await unlockAudio();

    setActiveRosettaSectionIndex(0);
    setEgyptPlaying("part1");
    // Also set isPlaying to true so the global bar shows it if needed
    setIsPlaying(true);

    const audio1 = audioManager.play("/rosetta01.mp3", { volume }) as HTMLAudioElement;
    egyptAudioRef.current = audio1;

    const onPart1Ended = () => {
      cleanupEgyptAudio();
      setActiveRosettaSectionIndex(1);
      setEgyptPlaying("part2");

      const audio2 = audioManager.play("/rosetta02.mp3", { volume }) as HTMLAudioElement;
      egyptAudioRef.current = audio2;

      const onPart2Ended = () => {
        cleanupEgyptAudio();
        setEgyptPlaying("completed");
        setIsPlaying(false);
      };

      egyptEndedListenerRef.current = onPart2Ended;
      audio2.addEventListener("ended", onPart2Ended);
      audio2.play().catch((e) => {
        console.warn("audio2 play failed:", e);
        setEgyptPlaying("completed");
        setIsPlaying(false);
      });
    };

    egyptEndedListenerRef.current = onPart1Ended;
    audio1.addEventListener("ended", onPart1Ended);
    audio1.play().catch((e) => {
      console.warn("audio1 play failed, needs interaction:", e);
      setEgyptPlaying("none");
      setIsPlaying(false);
    });
  };

  const handleEgyptPageSelect = (pageId: string | null) => {
    cleanupEgyptAudio();
    setIsPlaying(false);

    if (!pageId) {
      setActiveEgyptPageId(null);
      setActiveEgyptSectionIndex(0);
      setActiveRosettaSectionIndex(0);
      handlePlayEgypt(true);
      return;
    }

    setActiveEgyptPageId(pageId);
    setEgyptPlaying("none");
    setActiveEgyptSectionIndex(0);
    setIsPlaying(true);

    const page = EGYPT_OLD_PAGES.find((p) => p.id === pageId);
    if (page) {
      const audioSources = Array.isArray(page.audio)
        ? page.audio
        : [page.audio];
      let currentIndex = 0;

      const playCurrent = () => {
        if (currentIndex >= audioSources.length) {
          cleanupEgyptAudio();
          setIsPlaying(false);
          return;
        }

        setActiveEgyptSectionIndex(currentIndex);

        const segmentAudio = audioManager.play(audioSources[currentIndex], { volume }) as HTMLAudioElement;
        segmentAudio.preload = "auto";
        egyptAudioRef.current = segmentAudio;

        const onEnded = () => {
          segmentAudio.removeEventListener("ended", onEnded);
          currentIndex += 1;
          if (currentIndex >= audioSources.length) {
            cleanupEgyptAudio();
            setIsPlaying(false);
            return;
          }
          setActiveEgyptSectionIndex(currentIndex);
          playCurrent();
        };

        egyptEndedListenerRef.current = onEnded;
        segmentAudio.addEventListener("ended", onEnded);

        segmentAudio.play().catch((e) => {
          console.warn("Egypt page audio play failed:", e);
          cleanupEgyptAudio();
          setIsPlaying(false);
        });
      };

      playCurrent();
    }
  };

  const unlockAudio = async () => {
    try {
      await initAudio();
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      // Her çağrıda yeni bir Audio nesnesi oluştur ki önceki durumdan etkilenmesin
      voiceAudioRef.current = audioManager.unlockAudio() as unknown as HTMLAudioElement;
      const audio = voiceAudioRef.current;
      await audio.play().catch(() => {});
      
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance("");
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewChange = async (view: typeof currentView) => {
    // ÖNCE view state'ini güncelle ki useEffect'teki temizlik kodları hemen çalışsın
    setCurrentView(view);

    // Stop all audio when changing views to prevent cross-talk
    audioManager.onPageChange(); // 🔥 Merkezi ses yöneticisi ile tüm sesleri durdur
    stopAudio();

    if (currentView === "index" && view !== currentView) {
      setDayPhase((prev) =>
        prev === "waiting" && !isGeminiDoneRef.current
          ? "init"
          : "done",
      );
    }
    await initAudio();
    setCurrentIndex(-1);

    // AudioContext'i unlock et
    try { await unlockAudio(); } catch {}

    if (view === "index") {
      // Index sayfasına girerken mesajı sıfırla ve yeniden üret
      setDailyMessage(null);
      setDayPhase("init");
      setIsShadowRevealed(false);
      // Başlık sesi (bXX.mp3) burada çalınmaz, mesaj hazır olunca (dayPhase === "done")
      // useEffect içinde çalınacak
      hasPlayedIndexAudioRef.current = false;
      // Mesaj üretimini doğrudan başlat (useEffect'e güvenme)
      setTimeout(() => {
        getDailyMessage(refreshSalt + 1);
      }, 100);
    }

    if (view === "mesaj") {
      // Play mesajlar.mp3 with timing-based section sync
      playMesajAudio();
    }

    if (view === "egypt_ancient") {
      await handlePlayEgypt(true);
    }

    if (view === "klan") {
      await playKlanAudio();
    }
  };

  const speakSentence = async (index: number, activeScript: string[], voiceStyle: string = "default") => {
    if (index >= activeScript.length) {
      setIsPlaying(false);
      return;
    }

    // Versiyonu artır (önceki çağrıları iptal etmek için) ama speechSynthesis'i iptal etme
    playVersionRef.current++;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    cleanupEgyptAudio();
    setEgyptPlaying("none");
    if (currentSourceRef.current) {
      if (currentSourceRef.current.onended)
        currentSourceRef.current.onended = null;
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
      try {
        (window as any).currentLocalAudio.pause();
        (window as any).currentLocalAudio.currentTime = 0;
      } catch (e) {}
      (window as any).currentLocalAudio = null;
    }
    currentUtteranceRef.current = null;
    setIsPlaying(true);
    setCurrentIndex(index);

    const currentVersion = playVersionRef.current;

    const playUsingNetworkTTS = async () => {
      try {
        if (geminiQuotaError) {
          throw new Error("Lokal ses sentezi modu (429 Quota Exceeded)");
        }
        await initAudio();

        let prefix = "";
        if (currentView === "sentence") {
          prefix = "cc";
        }

        if (prefix) {
          const fn = `/${prefix}${(index + 1).toString().padStart(2, '0')}.mp3`;
          try {
            const response = await fetch(fn, { method: 'HEAD' });
            if (response.ok) {
              const audioReq = await fetch(fn);
              if (audioReq.ok) {
                const arrayBuffer = await audioReq.arrayBuffer();
                const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
                const source = audioContextRef.current!.createBufferSource();
                source.buffer = audioBuffer;
                if (gainNodeRef.current) source.connect(gainNodeRef.current);
                else source.connect(audioContextRef.current!.destination);
                source.onended = () => {
                  if (playVersionRef.current !== currentVersion) return;
                  setIsPlaying(false);
                  timeoutRef.current = setTimeout(() => speakSentence(index + 1, activeScript, voiceStyle), 1200);
                };
                if (playVersionRef.current !== currentVersion) return;
                source.start();
                currentSourceRef.current = source;
                return; // skip network TTS
              }
            }
          } catch (e) {
            console.warn("Failed to play chunked audio:", fn, e);
          }
        }

        // No local audio available; use browser speech synthesis.
        throw new Error("No local audio available, using speechSynthesis fallback");
      } catch (err: any) {
        if (playVersionRef.current !== currentVersion) return;
        console.warn("TTS fallback activated due to error:", err);
        const errMsg = err?.message || "";
        const isQuota = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || JSON.stringify(err).includes("RESOURCE_EXHAUSTED") || JSON.stringify(err).includes("429");
        if (isQuota) {
          setGeminiQuotaError(true);
        }

        const utterance = new SpeechSynthesisUtterance(activeScript[index]);
        currentUtteranceRef.current = utterance;
        (window as any).ttsUtterances = (window as any).ttsUtterances || [];
        (window as any).ttsUtterances.push(utterance);
        utterance.lang = "tr-TR";

        const performSpeech = () => {
          const voices = window.speechSynthesis.getVoices();

          if (voiceStyle === "daily") {
            // Günlük mesaj için her cümlede farklı bir ses
            // Tüm sesler kullanılır (Edge'deki Microsoft Neural Voices dahil)
            // Dil/aksan/kadın/erkek fark etmez — her cümlede rastgele bir ses seçilir
            const shuffled = [...voices].sort(() => Math.random() - 0.5);
            const selectedVoice = shuffled[0];
            if (selectedVoice) {
              utterance.voice = selectedVoice;
              utterance.rate = 0.82;
              utterance.pitch = Math.random() * 0.4 + 0.8; // 0.8–1.2 arası rastgele perde
            }
          } else {
            // Varsayılan: Türkçe kadın ses tercih et
            utterance.rate = 0.78;
            utterance.pitch = 1.05;
            
            const trVoices = voices.filter((v: any) => v.lang.includes("tr"));
            let femaleVoice = trVoices.find((v: any) =>
              v.name.toLowerCase().includes("yelda")
            );
            if (!femaleVoice) {
              femaleVoice = trVoices.find((v: any) =>
                v.name.toLowerCase().includes("zeynep")
              );
            }
            if (!femaleVoice) {
              femaleVoice = trVoices.find((v: any) =>
                v.name.toLowerCase().includes("kadın") ||
                v.name.toLowerCase().includes("female") ||
                v.name.toLowerCase().includes("emine") ||
                v.name.toLowerCase().includes("siri") ||
                v.name.toLowerCase().includes("ayşe")
              );
            }
            if (!femaleVoice) {
              femaleVoice = trVoices.find((v: any) => !v.name.toLowerCase().includes("tolga"));
            }
            if (femaleVoice) {
              utterance.voice = femaleVoice;
            } else if (trVoices.length > 0) {
              utterance.voice = trVoices[0];
            }
          }
          
          utterance.volume = 1;
          utterance.onend = () => {
            if (
              currentUtteranceRef.current !== utterance ||
              playVersionRef.current !== currentVersion
            )
              return;
            if (currentView === "sentence") {
              setIsPlaying(false);
              timeoutRef.current = setTimeout(
                () => speakSentence(index + 1, activeScript, voiceStyle),
                1200,
              );
            } else if (voiceStyle === "daily") {
              // Günlük mesaj - cümleler arası 2.5 saniye bekle
              timeoutRef.current = setTimeout(
                () => speakSentence(index + 1, activeScript, voiceStyle),
                2500,
              );
            } else {
              setCurrentIndex(-2);
              const delay =
                currentView === "eg_detail"
                  ? 200
                  : 1200;
              timeoutRef.current = setTimeout(
                () => speakSentence(index + 1, activeScript, voiceStyle),
                delay,
              );
            }
          };
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.speak(utterance);
          }
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            performSpeech();
          };
        } else {
          performSpeech();
        }
      }
    };

    playUsingNetworkTTS();
  };

  useEffect(() => {
    stopAudio();
    let rafId: number;
    let isUnmounted = false;

    const playFullAudioWithTimings = async (script: string[], audioUrl: string, onEnded?: () => void) => {
      try {
        setIsPlaying(true);
        setCurrentIndex(-1);

        const getTimings = (duration: number) => {
          const getWeight = (text: string) => text.length + text.split(/[.,!?]/).length * 15;
          const weights = script.map((t) => getWeight(t));
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let cumulativeTime = 0;
          return weights.map((weight: number) => {
            const time = cumulativeTime;
            cumulativeTime += (weight / totalWeight) * duration;
            return time;
          });
        };

        if (!audioContextRef.current) await initAudio();
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error("Audio not found: " + audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        let source: AudioBufferSourceNode | null = null;

        try {
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
          if (isUnmounted) return;

          source = audioContextRef.current!.createBufferSource();
          source.buffer = audioBuffer;

          if (gainNodeRef.current) {
            source.connect(gainNodeRef.current);
          } else {
            source.connect(audioContextRef.current!.destination);
          }

          source.onended = () => {
            if (isUnmounted) return;
            cancelAnimationFrame(rafId);
            setIsPlaying(false);
            if (onEnded) onEnded();
          };

          currentSourceRef.current = source;
          const startTime = audioContextRef.current!.currentTime;
          const timings = getTimings(audioBuffer.duration);

          const checkTime = () => {
             if (isUnmounted) return;
             const currentTime = audioContextRef.current!.currentTime - startTime;
             let newIndex = 0;
             for (let i = timings.length - 1; i >= 0; i--) {
                if (currentTime >= timings[i]) {
                  newIndex = i;
                  break;
                }
             }
             setCurrentIndex(newIndex);
             rafId = requestAnimationFrame(checkTime);
          };

          source.start(0);
          rafId = requestAnimationFrame(checkTime);

        } catch (decodeErr) {
          console.warn("decodeAudioData failed, trying HTML5 Audio fallback for " + audioUrl, decodeErr);
          
          if (isUnmounted) return;
          const audio = audioManager.play(audioUrl, { volume }) as HTMLAudioElement;
          
          // Önceki currentLocalAudio'yı durdur
          if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
            try { (window as any).currentLocalAudio.pause(); } catch (e) {}
          }
          (window as any).currentLocalAudio = audio;

          const onReady = () => {
            if (isUnmounted) return;
            const timings = getTimings(audio.duration);
            
            const checkTime = () => {
              if (isUnmounted) return;
              const currentTime = audio.currentTime;
              let newIndex = 0;
              for (let i = timings.length - 1; i >= 0; i--) {
                if (currentTime >= timings[i]) {
                  newIndex = i;
                  break;
                }
              }
              setCurrentIndex(newIndex);
              rafId = requestAnimationFrame(checkTime);
            };

            audio.play().catch(e => {
               console.error("HTML5 Audio play failed:", e);
               if (isUnmounted) return;
               speakSentence(0, script, "default");
            });
            rafId = requestAnimationFrame(checkTime);
          };

          if (audio.readyState >= 1) {
             onReady();
          } else {
             audio.onloadedmetadata = onReady;
          }

          audio.onended = () => {
            if (isUnmounted) return;
            cancelAnimationFrame(rafId);
            setIsPlaying(false);
            if (onEnded) onEnded();
          };

          audio.onerror = () => {
             console.error("HTML5 Audio error on " + audioUrl);
             if (isUnmounted) return;
             speakSentence(0, script, "default");
          };
          
          currentSourceRef.current = { stop: () => audio.pause(), onended: null } as any;
        }

      } catch (e) {
        console.error(e);
        if (isUnmounted) return;
        speakSentence(0, script, "default");
      }
    };

    if (currentView === "sentence") {
      speakSentence(0, questionScript, "default");
    } else if (["search", "day", "klan", "mesaj"].includes(currentView)) {
      // handled separately
    } else {
      stopAudio();
      setCurrentIndex(-1);
    }

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(rafId);
    };
  }, [currentView, activeEgDetail, dailyMessage, unasAllTexts]);





  useEffect(() => {
    // Service Worker'ı kaydet (sadece bildirim için değil, diğer SW özellikleri için)
    if ('serviceWorker' in navigator) {
      // Önce eski kayıtları temizle
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).then(() => {
        // Yeni service worker'ı kaydet
        return navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
      }).then((registration) => {
        console.log('Service Worker registered:', registration);
      }).catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    }

    // LocalNotifications iznini iste ve zamanlayıcıları kur
    const setupLocalNotifications = async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        // İzin durumunu kontrol et
        const permResult = await LocalNotifications.checkPermissions();
        if (permResult.display === 'prompt') {
          const reqResult = await LocalNotifications.requestPermissions();
          if (reqResult.display !== 'granted') {
            console.warn('Local notification permission not granted');
            return;
          }
        } else if (permResult.display === 'denied') {
          console.warn('Local notification permission denied');
          return;
        }

        // Önce varsa eski zamanlayıcıları temizle
        await LocalNotifications.cancel({
          notifications: [
            { id: 705 }, { id: 805 }, { id: 905 }, { id: 1005 },
            { id: 2145 }, { id: 2200 }, { id: 2215 },
            { id: 2245 }, { id: 2300 }, { id: 2315 },
            { id: 2320 }, { id: 2335 }, { id: 2350 },
            { id: 2338 }, { id: 2343 }, { id: 2348 }
          ]
        });

        // Bildirim başlığını al
        const baslik = dailyTitle.text || "Nefertiti";

        // 2 hedef saat için bildirim zamanlayıcıları kur (saha testi: 11:05, 11:15)
        const targetTimes = [
          { id: 1105, hour: 11, minute: 5 },
          { id: 1115, hour: 11, minute: 15 },
        ];

        const now = new Date();
        const todayStr = now.toLocaleDateString();

        for (const target of targetTimes) {
          // on: { hour, minute } ile her gün belirtilen saatte tekrarlayan bildirim
          await LocalNotifications.schedule({
            notifications: [{
              id: target.id,
              title: baslik,
              body: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
              largeBody: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
              summaryText: "Duy Beni",
              schedule: {
                on: { hour: target.hour, minute: target.minute },
                allowWhileIdle: true
              },
              sound: undefined,
              attachments: undefined,
              actionTypeId: "",
              extra: { url: "/?autoPlay=true" }
            }]
          });
        }

        console.log('✅ Local notifications scheduled for times: 11:05, 11:15 (saha testi)');
      } catch (err) {
        console.warn('LocalNotifications setup failed:', err);
      }
    };
   
       setupLocalNotifications(); // Geçici saha testi için aktif
   
       // Test için window'a expose et — konsoldan manuel test için
    (window as any).__testNotification = async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const baslik = dailyTitle.text || "Nefertiti";
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
      } catch (e) {
        console.warn("Test notification failed:", e);
      }
    };
  }, [dailyTitle]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showDuyBeniOverlay) {
      // 4 kere ardışık klik sesi çal (500ms aralıklarla)
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          try {
            audioManager.play("/click.mp3", { volume: 1.0 });
          } catch (e) {
            // Audio might fail if user hasn't interacted yet, that's fine
          }
        }, i * 500);
      }

      // Auto close after 5 minutes
      timer = setTimeout(
        () => {
          setShowDuyBeniOverlay(false);
        },
        5 * 60 * 1000,
      );
    }
    return () => clearTimeout(timer);
  }, [showDuyBeniOverlay]);

  // Alarm overlay aktif olduğunda döngüsel ses başlat
  useEffect(() => {
    if (showAlarmOverlay) {
      // Alarm sesini başlat (kullanıcı kapatana kadar döner) - seçili ses kaynağını kullan
      audioManager.playAlarm(alarmSound, 1.0);

      // Telefonu uyanık tutmak için titreşim
      if (navigator.vibrate) {
        // 5 saniye titreşim, 2 saniye bekle, tekrar
        const vibrateInterval = setInterval(() => {
          navigator.vibrate([1000, 500, 1000, 500, 1000, 2000]);
        }, 6000);
        // cleanup
        (window as any).__alarmVibrateInterval = vibrateInterval;
      }
    } else {
      // Alarm kapatıldığında sesi ve titreşimi durdur
      audioManager.stopAlarm();
      if ((window as any).__alarmVibrateInterval) {
        clearInterval((window as any).__alarmVibrateInterval);
        (window as any).__alarmVibrateInterval = null;
      }
      if (navigator.vibrate) {
        navigator.vibrate(0); // titreşimi durdur
      }
    }
  }, [showAlarmOverlay]);

  // SALLAMA İLE TETİKLEME (Shake Gesture) - devicemotion event dinleyicisi
  useEffect(() => {
    // Sallama eşik değeri (m/s² cinsinden ivme)
    const SHAKE_THRESHOLD = 15;
    // Sallamalar arası minimum süre (ms)
    const SHAKE_COOLDOWN = 2000;

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!shakeArmed || shakeTriggered) return;

      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const now = Date.now();
      const last = shakeLastRef.current;

      // İlk okuma için referans al
      if (last.lastTime === 0) {
        shakeLastRef.current = { x: acc.x, y: acc.y, z: acc.z, lastTime: now };
        return;
      }

      // Son sallamadan bu yana yeterli süre geçti mi?
      if (now - last.lastTime < SHAKE_COOLDOWN) return;

      // İvme değişimini hesapla (delta)
      const dx = Math.abs(acc.x - last.x);
      const dy = Math.abs(acc.y - last.y);
      const dz = Math.abs(acc.z - last.z);
      const totalDelta = dx + dy + dz;

      // Referansı güncelle
      shakeLastRef.current = { x: acc.x, y: acc.y, z: acc.z, lastTime: now };

      // Eşik aşıldıysa sallama algılandı!
      if (totalDelta > SHAKE_THRESHOLD) {
        console.log('📳 SHAKE DETECTED! Delta:', totalDelta.toFixed(2));
        setShakeTriggered(true);
        setShakeArmed(false);
        // Alarm overlay'ini göster + ses başlat
        setShowAlarmOverlay(true);
      }
    };

    // Devicemotion event'ini dinlemeye başla
    if (typeof window !== 'undefined' && !shakeListenerRef.current) {
      window.addEventListener('devicemotion', handleMotion);
      shakeListenerRef.current = true;
      console.log('📳 Shake gesture listener ACTIVE');
    }

    return () => {
      if (typeof window !== 'undefined' && shakeListenerRef.current) {
        window.removeEventListener('devicemotion', handleMotion);
        shakeListenerRef.current = false;
        console.log('📳 Shake gesture listener CLEANED UP');
      }
    };
  }, [shakeArmed, shakeTriggered]);

  // Overlay izni (SYSTEM_ALERT_WINDOW) kontrolü - sadece Android'de çalışır
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { registerPlugin } = await import('@capacitor/core');
        const OverlayPermission = registerPlugin('OverlayPermission') as any;
        const result = await OverlayPermission.checkOverlayPermission() as any;
        const granted = result?.granted === true;
        setOverlayPermissionGranted(granted);
        if (!granted) {
          setShowOverlayPermissionModal(true);
        }
      } catch (e) {
        // Web ortamında veya plugin yoksa sorun değil
        console.log('OverlayPermission plugin not available (web ortamı)');
        setOverlayPermissionGranted(true);
      }
    };
    // Biraz gecikmeli kontrol et (app yüklendikten sonra)
    const timer = setTimeout(checkPermission, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleRequestOverlayPermission = async () => {
    try {
      const { registerPlugin } = await import('@capacitor/core');
      const OverlayPermission = registerPlugin('OverlayPermission') as any;
      await OverlayPermission.requestOverlayPermission();
      // Kullanıcı ayarlardan döndükten sonra tekrar kontrol et
      setTimeout(async () => {
        try {
          const result = await OverlayPermission.checkOverlayPermission() as any;
          const granted = result?.granted === true;
          setOverlayPermissionGranted(granted);
          if (granted) {
            setShowOverlayPermissionModal(false);
          }
        } catch (e) {
          console.warn('Re-check failed:', e);
        }
      }, 1500);
    } catch (e) {
      console.warn('requestOverlayPermission failed:', e);
    }
  };

  // autoPlay flag geldiğinde shakeArmed'ı true yap (bildirim alındı, sallama bekle)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoPlay') === 'true') {
      console.log('📳 Bildirim alındı! Shake sistemi silahlanıyor...');
      setShakeArmed(true);
      // URL'den autoPlay parametresini temizle
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const activeEgyptPage = activeEgyptPageId
    ? EGYPT_OLD_PAGES.find((p) => p.id === activeEgyptPageId) || null
    : null;

  const activeEgyptSections = activeEgyptPage
    ? getTextSections(
        activeEgyptPage.text,
        Array.isArray(activeEgyptPage.audio) ? activeEgyptPage.audio.length : 1,
      )
    : ROSETTA_SECTIONS;

  const activeSectionIndex = activeEgyptPageId
    ? activeEgyptSectionIndex
    : activeRosettaSectionIndex;

  const renderSection = (section: string, idx: number) => {
    const diff = idx - activeSectionIndex;
    const isCurrent = diff === 0;
    const isNext = diff === 1;
    const isPast = diff < 0;

    if (diff > 1) {
      return null;
    }

    // Rosetta'nın ilk bölümünde "Unas Piramidi'ndeki 283 cümle" metnini link yap
    const isRosettaFirstSection = !activeEgyptPageId && idx === 0;
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
      <p
        key={idx}
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
    );
  };

  const refreshMessage = () => {
    hasPlayedTitleRef.current = false;
    setDailyMessage(null);
    setDayPhase("init");
    setIsShadowRevealed(false);
    setRefreshSalt((prev) => prev + 1);
    setDailyTitle(getDailyTitle());
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#0a0a0a] sm:bg-[#050505] flex items-center justify-center overflow-hidden">
      <div
        className="bg-black flex flex-col items-center justify-center overflow-hidden relative cursor-pointer sm:rounded-[2rem] sm:border sm:border-white/10 sm:shadow-2xl phone-frame"
        style={{
          width: "100vw",
          height: "100dvh",
          minHeight: "0",
          minWidth: "0",
        }}
        onClick={() => {
          // no-op click handler
        }}
      >
        {/* Background Image Layer - ONLY FOR INTRO (kaldırıldı, donma yapıyordu) */}

        {/* Duy Beni Overlay - Renders on top of everything */}
        <AnimatePresence>
          {showDuyBeniOverlay && (
            <motion.div
              className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-8 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute top-10 left-0 right-0 flex justify-center pointer-events-none">
                <div className="text-white/50 text-[10px] tracking-widest uppercase font-light">
                  Yukarı Kaydırarak Kapat
                </div>
              </div>
              <motion.div
                drag="y"
                dragConstraints={{ top: -300, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  if (info.offset.y < -50) {
                    setShowDuyBeniOverlay(false);
                  }
                }}
                onClick={() => {
                  setShowDuyBeniOverlay(false);
                  handleViewChange("index");
                }}
                className="w-[80%] max-w-[320px] rounded-xl overflow-hidden cursor-pointer relative"
                initial={{ y: 50, scale: 0.9, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: -50, scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {/* Sadece tesadüfen üretilen mesaj başlığı */}
                <div className="w-full min-h-[280px] rounded-xl border border-yellow-500/20 shadow-[0_0_40px_rgba(234,179,8,0.2)] bg-gradient-to-b from-yellow-900/30 to-black/80 flex flex-col items-center justify-center p-8 text-center">
                  <h2 className="text-white/90 text-[12px] font-light leading-relaxed">
                    {(() => {
                      try {
                        const preGen = localStorage.getItem("preGeneratedMessage");
                        if (preGen) {
                          const parsed = JSON.parse(preGen);
                          if (parsed.title) return parsed.title;
                        }
                      } catch (e) {}
                      return "Nefertiti";
                    })()}
                  </h2>
                </div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/30 rounded-full" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERLAY İZİN MODAL - SYSTEM_ALERT_WINDOW izni yoksa göster */}
        {showOverlayPermissionModal && (
          <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6">
            <div className="bg-zinc-900 rounded-2xl border border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.15)] p-8 max-w-sm w-full text-center">
              <div className="text-5xl mb-4">🔔</div>
              <h2 className="text-yellow-500 text-lg font-bold mb-3 tracking-wider uppercase">
                Ekran Üstü İzni Gerekli
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                Alarmın kilitli ekranda tam ekran açılabilmesi için
                <strong className="text-white/90"> "Diğer uygulamaların üzerinde göster" </strong>
                iznini vermen gerekiyor.
              </p>
              <button
                onClick={handleRequestOverlayPermission}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-xl transition-all duration-200 active:scale-95 mb-3"
              >
                İZİN VER
              </button>
              <button
                onClick={() => setShowOverlayPermissionModal(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white/60 py-2 px-6 rounded-xl transition-all duration-200 text-sm"
              >
                Daha Sonra
              </button>
              <p className="text-white/30 text-[10px] mt-4 leading-relaxed">
                İzin verdikten sonra uygulamayı kapatıp tekrar açman gerekebilir.
              </p>
            </div>
          </div>
        )}

        {/* ALARM OVERLAY - Tam ekran, kilitli ekranda açılır, kapatana kadar ses döner */}
        <AnimatePresence>
          {showAlarmOverlay && (
            <motion.div
              className="fixed inset-0 z-[9998] bg-black/95 flex flex-col items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Alarm başlık */}
              <div className="text-center mb-6">
                <h1 className="text-red-500 text-3xl font-bold uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                  ⚠️ BİLDİRİM
                </h1>
                <p className="text-yellow-500/70 text-sm mt-3 tracking-wider font-light">
                  Kadim mesaj seni bekliyor
                </p>
                <p className="text-white/40 text-[10px] mt-2 tracking-[0.3em] uppercase">
                  {dailyTitle?.text || "Nefertiti"}
                </p>
              </div>

              {/* Dinamik animasyonlu simge */}
              <div className="relative w-32 h-32 mb-6">
                <div className="absolute inset-0 rounded-full bg-red-600/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-red-500/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-red-400/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl filter drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">🔔</span>
                </div>
              </div>

              {/* Ses seçme paneli */}
              <div className="mb-6 w-full max-w-xs">
                <button
                  onClick={() => setShowAlarmSoundPicker(!showAlarmSoundPicker)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 text-[10px] tracking-[0.2em] uppercase hover:bg-white/10 hover:text-white/80 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>🎵</span>
                  <span>Ses: {alarmSound === "/klan.mp3" ? "Klan" : alarmSound === "/his.mp3" ? "His" : alarmSound === "/click.mp3" ? "Klik" : "Özel"}</span>
                  <span className={`transform transition-transform duration-200 ${showAlarmSoundPicker ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {showAlarmSoundPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 bg-zinc-900/95 border border-white/10 rounded-xl overflow-hidden"
                  >
                    {[
                      { src: "/klan.mp3", label: "🎵 Klan", desc: "Varsayılan alarm sesi" },
                      { src: "/his.mp3", label: "🎵 His", desc: "Alternatif melodi" },
                      { src: "/click.mp3", label: "🎵 Klik", desc: "Kısa uyarı sesi" },
                      { src: "/mesajlar.mp3", label: "🎵 Mesaj", desc: "Uzun mesaj sesi" },
                    ].map((item) => (
                      <button
                        key={item.src}
                        onClick={() => {
                          setAlarmSound(item.src);
                          localStorage.setItem("alarm_sound", item.src);
                          setShowAlarmSoundPicker(false);
                          // Alarm çalıyorsa sesi hemen değiştir
                          audioManager.changeAlarmSource(item.src, 1.0);
                        }}
                        className={`w-full px-4 py-3 text-left border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-all duration-200 ${
                          alarmSound === item.src ? "bg-red-600/20 border-l-2 border-l-red-500" : ""
                        }`}
                      >
                        <p className="text-white/80 text-xs font-medium">{item.label}</p>
                        <p className="text-white/40 text-[9px] mt-0.5">{item.desc}</p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Kapat butonu - kullanıcı basana kadar ses döner */}
              <button
                onClick={() => {
                  setShowAlarmOverlay(false);
                  setShowAlarmSoundPicker(false);
                  // Ses ve titreşim useEffect ile otomatik durur
                }}
                className="px-10 py-4 bg-red-600/30 border-2 border-red-500/60 rounded-2xl text-red-400 text-sm font-bold tracking-[0.3em] uppercase hover:bg-red-500/40 hover:border-red-400 active:scale-95 transition-all duration-200 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              >
                🔕 BİLDİRİMİ KAPAT
              </button>

              <p className="text-white/30 text-[8px] mt-6 tracking-[0.2em] uppercase">
                Kapatana kadar ses devam eder
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* App Frame */}
        <div className="relative overflow-hidden bg-transparent border-transparent flex flex-col z-10 w-full h-full min-h-0">
          <AnimatePresence mode="wait">
            {currentView === "day" && (
              <motion.div
                key="day"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="max-w-md mx-auto space-y-6">
                  <div className="text-6xl mb-4">🌅</div>
                  <h2 className="text-yellow-500 text-lg font-bold tracking-[0.3em] uppercase">
                    GÜN
                  </h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Bu sayfa henüz hazır değil. Günlük rehber içeriği yakında eklenecek.
                  </p>
                  <button
                    onClick={() => handleViewChange("index")}
                    className="px-6 py-2 mt-4 border border-yellow-500/40 rounded-full text-yellow-500 text-xs tracking-widest uppercase hover:bg-yellow-500/10 transition-all"
                  >
                    Ana Sayfaya Dön
                  </button>
                </div>
              </motion.div>
            )}
            {currentView === "sentence" && (
              <motion.div
                key="sentence"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col relative w-full h-full items-center justify-center overflow-hidden max-w-sm mx-auto"
              >
                <p className="absolute top-2 left-4 right-4 text-white/60 text-[12px] sm:text-[13px] font-light tracking-wide text-center leading-relaxed z-10 pointer-events-none">
                  İsim, soyisim gibi kimlik bilgileri sorulmuyor. Seçtiğiniz en az altı cümle sizin karakterinizi tanımlıyor. Hissederek seçim yapın.
                </p>
                <div className="w-full px-4 flex justify-center shrink-0">
                  {selectedIndices.length < 6 ? (
                    <h1 className="text-red-500 text-2xl md:text-3xl font-bold uppercase animate-pulse text-center tracking-wider drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                      EN AZ 6 CÜMLE SEÇ
                    </h1>
                  ) : (
                    <h1 className="text-green-500 text-2xl md:text-3xl font-bold uppercase animate-pulse text-center tracking-wider drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] cursor-pointer"
                        onClick={() => {
                          localStorage.setItem("has_launched", "true");
                          handleViewChange("index");
                        }}
                    >
                      BİTİRMEK İÇİN TIKLA
                    </h1>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center px-4 w-full">
                  <div className="space-y-3 w-full flex flex-col items-center">
                    <motion.p
                      key={currentIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`text-[14px] font-light leading-relaxed tracking-wide text-center transition-colors duration-500 ${selectedIndices.includes(currentIndex) ? "text-[#25D366] drop-shadow-[0_0_10px_rgba(37,211,102,0.4)]" : "text-white"}`}
                    >
                      {questionScript[currentIndex]}
                    </motion.p>
                    {selectedIndices.includes(currentIndex) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[#25D366] text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 drop-shadow-[0_0_8px_rgba(37,211,102,0.4)] text-center"
                      >
                        <CheckCircle2 size={12} className="shrink-0" /> BU
                        CÜMLEYİ SEÇTİNİZ
                      </motion.div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1 w-full px-4 shrink-0">
                  {/* 2. Satır: Önceki, Numara, Sonraki */}
                  <div className="flex items-center justify-center gap-6 sm:gap-10 w-full max-w-md">
                    {/* Önceki */}
                    <div className="flex-1 flex justify-end">
                      <button
                        onClick={() => {
                          if (currentIndex > 0) {
                            if (timeoutRef.current)
                              clearTimeout(timeoutRef.current);
                            speakSentence(currentIndex - 1, questionScript, "default");
                          }
                        }}
                        className={`flex items-center gap-1 sm:gap-2 transition-all p-2 rounded-md hover:bg-white/5 active:scale-95 ${currentIndex <= 0 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                      >
                        <ChevronLeft
                          size={16}
                          className="text-yellow-500 shrink-0"
                        />
                        <span className="text-[10px] sm:text-[10px] uppercase tracking-widest text-white/80">
                          Önceki
                        </span>
                      </button>
                    </div>

                    {/* Numaratör */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-20">
                      <span className="text-[10px] sm:text-[10px] uppercase tracking-[0.3em] text-white/40">
                        Cümle
                      </span>
                      <div className="flex items-baseline gap-1 font-mono tracking-widest">
                        <span className="text-base sm:text-lg font-bold text-yellow-500">
                          {currentIndex + 1}
                        </span>
                        <span className="text-[10px] sm:text-[10px] text-white/30">
                          /16
                        </span>
                      </div>
                    </div>

                    {/* Sonraki */}
                    <div className="flex-1 flex justify-start">
                      <button
                        onClick={() => {
                          if (currentIndex < questionScript.length - 1) {
                            if (timeoutRef.current)
                              clearTimeout(timeoutRef.current);
                            speakSentence(currentIndex + 1, questionScript, "default");
                          }
                        }}
                        className={`flex items-center gap-1 sm:gap-2 transition-all p-2 rounded-md hover:bg-white/5 active:scale-95 ${currentIndex >= questionScript.length - 1 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                      >
                        <span className="text-[10px] sm:text-[10px] uppercase tracking-widest text-white/80">
                          Sonraki
                        </span>
                        <ChevronRight
                          size={16}
                          className="text-yellow-500 shrink-0"
                        />
                      </button>
                    </div>
                  </div>

                  {/* 3. Satır: İptal, Seçilen Sayacı, Seç */}
                  <div className="flex items-center justify-center gap-6 sm:gap-12 w-full max-w-md">
                    {/* Sol Seçenek (Kırmızı İptal) */}
                    <div className="flex-1 flex flex-col items-center">
                      <div className="relative flex flex-col items-center">
                        <button
                          onClick={() => {
                            if (timeoutRef.current)
                              clearTimeout(timeoutRef.current);
                            if (!rejectedIndices.includes(currentIndex)) {
                              setRejectedIndices([
                                ...rejectedIndices,
                                currentIndex,
                              ]);
                              setSelectedIndices(
                                selectedIndices.filter(
                                  (i) => i !== currentIndex,
                                ),
                              );

                              const currentAudio = (window as any)
                                .currentLocalAudio;
                              if (currentAudio) {
                                currentAudio.pause();
                              }
                              if ((window as any).speechSynthesis) {
                                window.speechSynthesis.cancel();
                              }

                              if (currentIndex < questionScript.length - 1) {
                                timeoutRef.current = setTimeout(() => {
                                  speakSentence(
                                    currentIndex + 1,
                                    questionScript,
                                    "default",
                                  );
                                }, 1200); // 1.2 sn bekle
                              }
                            } else {
                              setRejectedIndices(
                                rejectedIndices.filter(
                                  (i) => i !== currentIndex,
                                ),
                              );
                            }
                          }}
                          className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${rejectedIndices.includes(currentIndex) ? "bg-red-500/20 border border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "border border-white/30 text-white hover:text-white hover:border-white/50"}`}
                        >
                          <X size={20} />
                        </button>
                        {rejectedIndices.includes(currentIndex) && (
                          <span className="absolute top-14 mt-1 text-[10px] whitespace-nowrap drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] pointer-events-none tracking-widest font-bold z-10">
                            🚫 👤 ❌
                          </span>
                        )}
                        <span className="mt-2 text-[10px] text-white/50 tracking-[0.2em] font-light uppercase text-center">
                          İptal
                        </span>
                      </div>
                    </div>

                    {/* Ortadaki Sayaç */}
                    <div className="text-center flex flex-col items-center justify-center shrink-0 w-20">
                      <div className="text-yellow-500/60 text-[9px] tracking-[0.3em] uppercase">
                        SEÇİLEN
                      </div>
                      <div className="text-yellow-500 text-2xl font-mono font-bold tracking-[0.2em]">
                        {selectedIndices.length}
                      </div>
                      <div className="text-[10px] tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                        🔢 ✅
                      </div>
                    </div>

                    {/* Sağ Seçenek (Yeşil Seç) */}
                    <div className="flex-1 flex flex-col items-center">
                      <div className="relative flex flex-col items-center">
                        <button
                          onClick={() => {
                            if (timeoutRef.current)
                              clearTimeout(timeoutRef.current);
                            if (!selectedIndices.includes(currentIndex)) {
                              setSelectedIndices([
                                ...selectedIndices,
                                currentIndex,
                              ]);
                              setRejectedIndices(
                                rejectedIndices.filter(
                                  (i) => i !== currentIndex,
                                ),
                              );

                              const playHisAndNext = async () => {
                                try {
                                  if (!audioContextRef.current)
                                    await initAudio();
                                  const response = await fetch("/his.mp3");
                                  if (!response.ok)
                                    throw new Error("his.mp3 not found");
                                  const arrayBuffer =
                                    await response.arrayBuffer();
                                  const audioBuffer =
                                    await audioContextRef.current!.decodeAudioData(
                                      arrayBuffer,
                                    );
                                  const source =
                                    audioContextRef.current!.createBufferSource();
                                  source.buffer = audioBuffer;
                                  if (gainNodeRef.current) {
                                    source.connect(gainNodeRef.current);
                                  } else {
                                    source.connect(
                                      audioContextRef.current!.destination,
                                    );
                                  }

                                  source.onended = () => {
                                    if (
                                      currentIndex <
                                      questionScript.length - 1
                                    ) {
                                      timeoutRef.current = setTimeout(() => {
                                        speakSentence(
                                          currentIndex + 1,
                                          questionScript,
                                          "default",
                                        );
                                      }, 1000);
                                    }
                                  };

                                  currentSourceRef.current = source;
                                  source.start(0);
                                } catch (e) {
                                  console.warn("decodeAudioData failed for his.mp3, using HTML5 Audio fallback");
                                  const audio = audioManager.play("/his.mp3", { volume }) as HTMLAudioElement;
                                  // Önceki currentLocalAudio'yı durdur
                                  if (typeof window !== "undefined" && (window as any).currentLocalAudio) {
                                    try { (window as any).currentLocalAudio.pause(); } catch (e) {}
                                  }
                                  (window as any).currentLocalAudio = audio;
                                  audio.onended = () => {
                                    if ((window as any).currentLocalAudio === audio) {
                                      if (
                                        currentIndex <
                                        questionScript.length - 1
                                      ) {
                                        timeoutRef.current = setTimeout(() => {
                                          speakSentence(
                                            currentIndex + 1,
                                            questionScript,
                                            "default",
                                          );
                                        }, 1000);
                                      }
                                    }
                                  };
                                  audio.play().catch(err => {
                                    console.error("HTML5 Audio play failed for his", err);
                                    if ((window as any).currentLocalAudio === audio) {
                                      if (
                                        currentIndex <
                                        questionScript.length - 1
                                      ) {
                                        timeoutRef.current = setTimeout(() => {
                                          speakSentence(
                                            currentIndex + 1,
                                            questionScript,
                                            "default",
                                          );
                                        }, 1000);
                                      }
                                    }
                                  });
                                  currentSourceRef.current = { stop: () => audio.pause(), onended: null } as any;
                                }
                              };

                              const currentAudio = (window as any)
                                .currentLocalAudio;
                              if (currentAudio) {
                                currentAudio.pause();
                              }
                              if ((window as any).speechSynthesis) {
                                window.speechSynthesis.cancel();
                              }

                              playHisAndNext();
                            } else {
                              setSelectedIndices(
                                selectedIndices.filter(
                                  (i) => i !== currentIndex,
                                ),
                              );
                            }
                          }}
                          className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${selectedIndices.includes(currentIndex) ? "bg-[#25D366]/20 border border-[#25D366] text-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.4)]" : "border border-yellow-500/60 text-yellow-500 hover:text-yellow-400 hover:border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]"}`}
                        >
                          <Check size={24} />
                        </button>
                        {selectedIndices.includes(currentIndex) && (
                          <span className="absolute top-14 mt-1 text-[10px] whitespace-nowrap drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] pointer-events-none text-[#25D366] tracking-widest font-bold z-10">
                            🎯 ✅
                          </span>
                        )}
                        <span className="mt-2 text-[9px] text-yellow-500/70 font-light tracking-[0.2em] uppercase text-center">
                          Seç
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={selectedIndices.length < 6}
                    onClick={() => {
                      localStorage.setItem("has_launched", "true");
                      handleViewChange("index");
                    }}
                    className="flex flex-col items-center gap-1 disabled:opacity-10 group mt-1"
                  >
                    <div className="w-10 h-10 rounded-full border border-yellow-500 flex items-center justify-center text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)] group-hover:bg-yellow-500 group-hover:text-black transition-all">
                      <CheckCircle2 size={18} />
                    </div>
                    <span className="text-[8px] tracking-[0.5em] text-yellow-500 uppercase">
                      ANALİZ ET
                    </span>
                  </button>
                </div>
                {/* Alt kısım - pisxaloi resmi */}
                <div className="absolute bottom-[100px] left-0 right-0 w-full flex justify-center pointer-events-none">
                  <img
                    src="/pisxaloi.png"
                    alt=""
                    className="w-[100px] h-[100px] object-contain opacity-80"
                  />
                </div>
              </motion.div>
            )}




            {currentView === "mesaj" && (
              <motion.div
                key="mesaj"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex-1 flex flex-col justify-center items-center p-6 text-center overflow-y-auto h-full scrollbar-hide"
              >
                <button
                  onClick={() => handleViewChange("index")}
                  className="absolute top-4 left-4 z-[200] p-2 group bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:border-yellow-500/50 active:scale-95 transition-all font-bold cursor-pointer"
                >
                  <RotateCcw
                    size={16}
                    className="text-white group-hover:text-yellow-500 transition-colors"
                  />
                </button>

                <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center min-h-0 relative">

                  {/* dikey.png - Sağ kenara yaslı, 200px yukarı taşınmış */}
                  <div className="absolute right-0 top-[-400px] bottom-0 w-14 md:w-16 flex items-center justify-center pointer-events-none z-10">
                    <img
                      src="/dikey.png"
                      alt="Mesaj üretim şeması"
                      className="w-full h-auto object-contain opacity-60 scale-90"
                    />
                  </div>

                  {/* Cümle-cümle senkron gösterici */}
                  <div className="w-full px-4 md:px-0 flex flex-col items-center justify-center flex-1 overflow-y-auto">
                    {mesajSegmentIndex >= 0 && mesajSegmentIndex < MESAJ_CUMLELERI.length ? (
                      <div className="w-full max-w-xl space-y-3">
                        {MESAJ_CUMLELERI.map((cümle, idx) => {
                          const isActive = idx === mesajSegmentIndex;
                          const isPrev = idx === mesajSegmentIndex - 1;
                          const isNext = idx === mesajSegmentIndex + 1;
                          const isVisible = isActive || isPrev || isNext;
                          if (!isVisible) return null;
                          return (
                            <motion.p
                              key={idx}
                              initial={isActive ? { opacity: 0, y: 20 } : false}
                              animate={{
                                opacity: isActive ? 1 : 0.35,
                                y: 0,
                                scale: isActive ? 1 : 0.95,
                              }}
                              transition={{ duration: 0.4, ease: "easeInOut" }}
                              className={`leading-[1.6] text-justify transition-all duration-500 ${
                                isActive
                                  ? "text-yellow-400 text-[12px] font-thin"
                                  : "text-white/90 text-[12px] font-thin"
                              }`}
                            >
                              {cümle}
                            </motion.p>
                          );
                        })}
                      </div>
                    ) : mesajSegmentIndex === -1 ? (
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-white/60 text-sm animate-pulse">
                          Sesli metin hazırlanıyor...
                        </p>
                        <p className="text-white/30 text-[11px] max-w-md leading-relaxed">
                          Bu bölümde mesajların nasıl üretildiğini adım adım göreceksiniz.
                          Her cümle sesli olarak okunurken ekranda sırayla belirecek.
                        </p>
                      </div>
                    ) : (
                      <p className="text-white/40 text-sm">
                        Tamamlandı ✓
                      </p>
                    )}
                  </div>

                  {/* İlerleme göstergesi */}
                  <div className="text-center text-[10px] uppercase tracking-[0.3em] text-white/30 pt-4 pb-2">
                    {mesajSegmentIndex >= 0 && mesajSegmentIndex < MESAJ_CUMLELERI.length
                      ? `Cümle ${mesajSegmentIndex + 1} / ${MESAJ_CUMLELERI.length}`
                      : mesajSegmentIndex === -1
                        ? "Sesli metin hazırlanıyor..."
                        : "Tamamlandı"}
                   </div>
                 </div>

                 {/* Alt kısım - pisxaloi resmi (index sayfasındakiyle aynı pozisyonda) */}
                 <div className="absolute bottom-[100px] left-0 right-0 w-full flex justify-center pointer-events-none">
                   <img
                     src="/pisxaloi.png"
                     alt=""
                     className="w-[100px] h-[100px] object-contain opacity-80"
                   />
                 </div>
               </motion.div>
             )}
 
             {currentView === "index" && (
              <motion.div
                key="index"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col relative justify-start items-center p-3 pt-8 text-center overflow-hidden h-full min-h-0"
              >
                {!dailyMessage || dayPhase !== "done" ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-3">
                    <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                    <p className="text-yellow-500 text-[10px] tracking-[0.5em] uppercase animate-pulse">
                      {dayPhase === "waiting" || dayPhase === "playing"
                        ? "Kadim bağ kuruluyor. Biraz sonra Nefertiti mesajı verecek..."
                        : "Kadim Kayıtlar Okunuyor..."}
                    </p>
                    {dayPhase === "playing" && (
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
                {/* Alt kısım - pisxaloi resmi (buton olarak) */}
                <div className="absolute bottom-[80px] left-0 right-0 w-full flex justify-center">
                  <img
                    src="/pisxaloi.png"
                    alt="Test Bildirimi Gönder"
                    onClick={() => {
                      if ((window as any).__testNotification) {
                        (window as any).__testNotification();
                      }
                    }}
                    className="w-[100px] h-[100px] object-contain opacity-80 cursor-pointer active:scale-90 transition-transform duration-150 hover:opacity-100 hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:brightness-110"
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
              </motion.div>
            )}

            {currentView === "egypt_ancient" && (
              <motion.div
                key="egypt_ancient"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col relative h-full overflow-hidden bg-black pb-28"
              >
                {/* Back Button */}
                <button
                  onClick={() => handleViewChange("index")}
                  className="absolute top-4 left-4 z-[200] p-2 group bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:border-yellow-500/50 active:scale-95 transition-all font-bold cursor-pointer"
                >
                  <RotateCcw
                    size={16}
                    className="text-white group-hover:text-yellow-500 transition-colors"
                  />
                </button>

                {/* Split Responsive Container for Main Text + Right Sidebar */}
                <div className="flex-1 flex flex-row relative h-full w-full max-w-2xl mx-auto overflow-hidden">
                  
                  {/* Main Content Area on Left/Center */}
                  <div className="flex-1 flex flex-col items-center justify-start p-6 pr-16 pt-20 h-full text-center relative w-full overflow-y-auto scrollbar-hide">
                    {/* If an archetype is selected, we can show its own image, otherwise show Rosetta image */}
                    <div className="w-full mb-6 mt-4 flex flex-col items-center">
                      <img
                        src={
                          activeEgyptPageId
                            ? EGYPT_OLD_PAGES.find((p) => p.id === activeEgyptPageId)
                                ?.image || "/roset.jpg"
                            : "/roset.jpg"
                        }
                        alt={
                          activeEgyptPageId
                            ? EGYPT_OLD_PAGES.find((p) => p.id === activeEgyptPageId)
                                ?.name || "Rosetta Taşı"
                            : "Rosetta Taşı"
                        }
                        className="max-h-52 sm:max-h-56 w-auto object-contain rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.12)]"
                      />
                      <span className="mt-2 text-[10px] text-white/50 uppercase tracking-[0.35em]">
                        {activeEgyptPageId
                          ? EGYPT_OLD_PAGES.find((p) => p.id === activeEgyptPageId)
                              ?.name
                          : "Rosetta Taşı - Antik Mısır'ın anahtarı"}
                      </span>
                    </div>

                    {/* Text panel */}
                    <div className="w-full px-2 flex flex-col gap-4 text-white/90">
                      {activeEgyptSections.map((section, idx) => renderSection(section, idx))}

                      {/* Unas sayfasının altında "283 cümle" linki */}
                      {activeEgyptPageId === "unas" && (
                        <div className="mt-4 pt-2 border-t border-white/10 text-center">
                          <span
                            onClick={() => setCurrentView("unas_texts")}
                            className="text-yellow-500/90 hover:text-yellow-400 underline decoration-yellow-600/40 hover:decoration-yellow-400/80 underline-offset-2 cursor-pointer transition-all duration-200 text-[12px] tracking-wider font-medium"
                          >
                            → O enteresan 283 cümle
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Floating Right Column for the 8 Icons */}
                  <div className="absolute right-2 top-20 bottom-24 w-12 flex flex-col gap-2 flex-nowrap items-center justify-start py-2 overflow-y-auto scrollbar-hide z-[200]">
                    {EGYPT_OLD_PAGES.map((page) => {
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
              </motion.div>
            )}

            {currentView === "unas_texts" && (
              <motion.div
                key="unas_texts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex-1 flex flex-col items-center p-4 pt-10 text-center overflow-y-auto h-full scrollbar-hide bg-black"
              >
                {/* Geri butonu */}
                <button
                  onClick={() => setCurrentView("egypt_ancient")}
                  className="absolute top-4 left-4 z-[200] p-2 group bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:border-yellow-500/50 active:scale-95 transition-all font-bold cursor-pointer"
                >
                  <RotateCcw
                    size={16}
                    className="text-white group-hover:text-yellow-500 transition-colors"
                  />
                </button>

                <div className="w-full max-w-2xl mx-auto">
                  <h2 className="text-yellow-500 text-[14px] md:text-[18px] font-bold tracking-[0.3em] uppercase mb-2">
                    UNAS PİRAMİDİ
                  </h2>
                  <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase mb-6">
                    283 Cümle
                  </p>

                  <div className="space-y-3 text-left">
                    {unasAllTexts.length > 0 ? (
                      unasAllTexts.map((text, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-yellow-500/20 transition-all duration-200"
                        >
                          <span className="text-yellow-500/90 text-[11px] font-mono mr-2 align-top">
                            {String(idx + 1).padStart(3, "0")}
                          </span>
                          <span className="text-white/70 text-[15px] md:text-[17px] leading-relaxed">
                            {text}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/40 text-sm text-center py-12">
                        Metinler yükleniyor...
                      </p>
                    )}
                  </div>

                  <div className="text-center text-[10px] uppercase tracking-[0.3em] text-white/20 pt-6 pb-12">
                    {unasAllTexts.length > 0
                      ? `Toplam ${unasAllTexts.length} cümle`
                      : "Yükleniyor"}
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === "klan" && (
              <motion.div
                key="klan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-start pt-4 sm:pt-6 text-center overflow-x-hidden overflow-y-auto pb-2 scrollbar-hide"
              >
                {/* Arka plan resmi - absolute katman, tam ekran */}
                <div className="absolute inset-0 z-0">
                  <img
                    src="/klanbac.jpg"
                    alt="Klan Arka Plan"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* İçerik - relative katman */}
                <div className="relative z-10 w-full h-full flex flex-col items-center">
                  <h2 className="text-white text-[12px] sm:text-[14px] font-extralight tracking-[0.8em] mb-3 shrink-0 uppercase ml-[0.8em] px-4">
                    KLAN
                  </h2>

                  {/* Klan listesi */}
                  <div className="flex-1 w-full max-w-sm px-4 min-h-0 flex flex-col z-20 mt-2">
                    <p className="text-white/50 text-[10px] tracking-widest uppercase mb-2 shrink-0 text-left w-full">
                      Klan listesi ({klanListMembers.length})
                    </p>
                    <div className="flex-1 min-h-0 overflow-y-auto rounded-md border border-white/10 bg-black/40 backdrop-blur-sm scrollbar-hide">
                      {klanListMembers.length === 0 ? (
                        <p className="text-white/40 text-[11px] py-6 px-3 text-center leading-relaxed">
                          Rehberden kişi seçip davet gönderince burada görünür.
                        </p>
                      ) : (
                        <ul className="divide-y divide-white/10">
                          {klanListMembers.map((f) => (
                            <li
                              key={f.id}
                              className="flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                            >
                              <span className="text-white text-[13px] font-light truncate flex-1">
                                {f.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeKlanMember(f.id)}
                                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border border-red-500/40 bg-red-950/40 text-red-400 text-[10px] hover:bg-red-900/50 transition-all"
                                title="Listeden çıkar"
                              >
                                <X size={12} />
                                Çıkar
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Ses kontrol butonu */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isPlaying) {
                        stopAudio();
                      } else {
                        playKlanAudio();
                      }
                    }}
                    className="relative z-10 mt-3 mb-1 p-2 rounded-full border border-yellow-500/40 bg-black/30 backdrop-blur-sm hover:bg-yellow-500/20 transition-all shrink-0"
                    title={isPlaying ? "Sesi Durdur" : "Sesi Başlat"}
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>

                  {/* WhatsApp davet — alt kısım */}
                  <div className="shrink-0 flex flex-col items-center pb-24 sm:pb-28 w-full px-4 mt-2">
                    <div className="w-full max-w-sm relative overflow-hidden rounded-md border border-yellow-500/30 bg-black/50 backdrop-blur-md p-4 flex flex-col items-center text-center shadow-[0_0_25px_rgba(234,179,8,0.15)]">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent opacity-60" />

                      <p className="text-white/90 font-light text-[11px] sm:text-[12px] leading-relaxed relative z-10 px-2">
                        <span className="text-yellow-500 font-semibold">Arkadaşlarını davet et,</span> klanını kur.
                      </p>
                      <p className="text-white/80 font-light text-[10px] sm:text-[11px] leading-relaxed relative z-10 px-2 mt-2">
                        Butona basınca rehber açılır; seçtiğin kişiler listeye eklenir ve WhatsApp daveti hazırlanır.
                      </p>
                      <p className="text-white/60 font-light text-[9px] sm:text-[10px] leading-relaxed relative z-10 px-2 mt-2">
                        Listeden istediğin kişiyi Çıkar ile silebilirsin. Süre sınırı yok.
                      </p>
                      <div className="mt-3 pt-3 border-t border-yellow-500/20 w-full">
                        <button
                          onClick={handleSendKankInvite}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-600/80 hover:bg-green-600 text-white text-[10px] font-medium tracking-wide transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] w-full justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          Rehberden Seç ve Davet Gönder
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Received Message Detail View */}
          <AnimatePresence>
            {selectedMessage && (
              <motion.div
                initial={{ opacity: 0, x: "100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "100%" }}
                className="absolute inset-0 z-[150] bg-zinc-950 p-8 pt-24 text-center overflow-y-auto"
              >
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="absolute top-8 left-8 p-2 border border-white/10 rounded-full text-white hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
                <h3 className="text-yellow-500 text-[9px] tracking-[0.5em] font-bold uppercase mb-12">
                  MESAJ DETAYI
                </h3>

                <div className="w-full max-w-2xl mx-auto space-y-8 text-left pb-12 mt-8">
                  <div className="p-8 bg-zinc-900/50 border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                      {selectedMessage.type === "daily" ? (
                        <Sparkles size={80} />
                      ) : selectedMessage.type === "dream" ? (
                        <Moon size={80} />
                      ) : (
                        <MessageSquare size={80} />
                      )}
                    </div>
                    <p className="text-white/90 text-sm font-light leading-relaxed relative z-10">
                      {selectedMessage.type === "daily"
                        ? selectedMessage.content.synthesis
                        : selectedMessage.type === "dream"
                          ? selectedMessage.content.interpretation
                          : selectedMessage.content.answer?.text ||
                            selectedMessage.content}
                    </p>
                  </div>

                  {selectedMessage.type === "daily" && (
                    <div className="space-y-6 opacity-100 bg-zinc-900/30 p-8 rounded-2xl border border-white/5">
                      <div className="space-y-2">
                        <span className="text-[9px] tracking-[0.4em] text-yellow-500 font-bold uppercase block flex items-center gap-2">
                          <Sparkles size={12} />
                          KADİM SEMBOL
                        </span>
                        <p className="text-sm text-white/70 leading-relaxed">
                          {selectedMessage.content.ancientSymbol} - "
                          {selectedMessage.content.ancientMeaning}"
                        </p>
                      </div>
                      <div className="space-y-2 pt-4 border-t border-white/5">
                        <span className="text-[9px] tracking-[0.4em] text-yellow-500 font-bold uppercase block flex items-center gap-2">
                          <Users size={12} />
                          JUNG NOTU
                        </span>
                        <p className="text-sm text-white/70 leading-relaxed">
                          "{selectedMessage.content.jungNote}"
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedMessage.type === "question" &&
                    selectedMessage.content.question && (
                      <div className="bg-zinc-900/30 p-8 rounded-2xl border border-white/5 space-y-2 opacity-100">
                        <span className="text-[9px] tracking-[0.4em] text-yellow-500 font-bold uppercase block flex items-center gap-2">
                          <MessageSquare size={12} />
                          SORULAN SORU
                        </span>
                        <p className="text-sm text-white/70 leading-relaxed">
                          "{selectedMessage.content.question}"
                        </p>
                      </div>
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons Nav (Left/Right) - Fixed Position Coordinates */}
          {user &&
            !["search", "sentence", "day"].includes(
              currentView,
            ) && (
              <>
              </>
            )}

          {/* Bottom Area Nav Layer */}
          <div className="absolute bottom-0 left-0 right-0 z-[120] flex flex-col pointer-events-none">
            {/* Audio Status & Control Bar */}
            <div className="w-full flex flex-col px-0 pointer-events-auto z-10">
              <div
                className={`flex justify-between items-center px-4 overflow-hidden transition-all duration-300 ${isPlaying && currentView !== "klan" ? "h-5 py-0.5 opacity-100" : "h-0 py-0 opacity-0"} ${["search", "day", "sentence", "klan"].includes(currentView) ? "bg-transparent" : "bg-black/60 backdrop-blur-sm"}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                </div>
                <button
                  onClick={stopAudio}
                  className="flex items-center gap-1 px-2 py-0.5 border border-white/10 rounded-full text-[9px] tracking-[0.2em] text-white/40 hover:text-white hover:border-white/20 transition-all uppercase cursor-pointer"
                >
                  <X size={6} />
                  SESİ KES
                </button>
              </div>
              <div
                className={`w-full flex items-center justify-between px-4 py-1.5 ${["search", "day", "sentence", "klan"].includes(currentView) ? "bg-transparent" : "bg-black/60 backdrop-blur-md border-t border-b border-white/5"}`}
              >
                <span className="text-[10px] text-white/50 tracking-widest uppercase mr-2">
                  SES
                </span>
                <div className="flex-1 h-1.5 bg-zinc-900 rounded-full relative overflow-hidden group">
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-yellow-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${volume * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                </div>
                <span className="text-[9px] text-yellow-500 tracking-widest ml-2 w-6 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            {/* Bottom Nav Icons */}
            <div
              className={`w-full flex justify-center items-end px-0 pointer-events-auto ${["search", "day", "sentence", "klan"].includes(currentView) ? "bg-transparent" : "bg-black/60 backdrop-blur-sm"}`}
            >
              <div className="flex justify-center items-end w-[260px] mx-auto relative">
                {navItems.map((item) => {
                  const isSentenceIncomplete = item.id === "sentence" && selectedIndices.length < 6;
                  const showAsRedDot = isSentenceIncomplete;

                  return (
                  <div
                    key={item.id + "-v2"}
                    className="relative flex-1 flex flex-col items-center group -mx-[1px] pointer-events-auto"
                  >
                    {/* Tooltip - only visible on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 backdrop-blur-sm border border-white/10 rounded text-[8px] text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                      {item.tooltip}
                    </div>

                    <button
                      onClick={() => handleViewChange(item.id as any)}
                      className="w-full flex flex-col items-center transition-all min-w-0 cursor-pointer outline-none pb-0.5"
                    >
                      <div
                        className={`w-full aspect-square border-[0.5px] border-b-0 border-r-0 last:border-r overflow-hidden transition-all duration-500 flex items-center justify-center p-0.5 relative ${
                          currentView === item.id
                            ? "border-yellow-500/80 shadow-[0_-10px_20px_rgba(234,179,8,0.3)] bg-white/10 z-10 scale-105 -translate-y-1 rounded-t-md"
                            : "border-white/10 group-hover:border-white/30 group-hover:bg-white/5 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:z-10 group-hover:-translate-y-1 group-hover:scale-105 rounded-t-sm"
                        }`}
                      >
                        {showAsRedDot && (
                          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse z-20" />
                        )}
                        {(item as any).image ? (
                          <img
                            src={(item as any).image}
                            className={`w-full h-full object-contain transition-all duration-700 brightness-110 contrast-110 ${currentView === item.id ? "opacity-100 scale-100" : "opacity-100 group-hover:scale-105"}`}
                            alt={item.tooltip}
                          />
                        ) : item.icon ? (
                          <item.icon
                            size={24}
                            className={`transition-all duration-700 ${currentView === item.id ? "text-yellow-500 scale-100" : "text-white/40 group-hover:text-white/80 group-hover:scale-105"}`}
                          />
                        ) : null}
                      </div>
                    </button>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
