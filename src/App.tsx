import React, { useState, useCallback, useEffect } from "react";
import "./index.css";
import Mesaj, { generateDailyMessage } from "./Mesaj";
import Nasil from "./Nasil";
import Klanim from "./Klanim";
import Cümleler from "./Cümleler";
import BottomNav from "./BottomNav";
import { audioManager } from "./utils/audioManager";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState("home");
  const [volume, setVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("volume");
      return saved ? parseFloat(saved) : 0.5;
    }
    return 0.5;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [speakSentence, setSpeakSentence] = useState<((index: number, script: string[], voiceType: string) => void) | null>(null);
  const [questionScript, setQuestionScript] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [rejectedIndices, setRejectedIndices] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleBack = useCallback(() => {
    setCurrentView("home");
  }, []);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  const handleSentenceNavigate = useCallback((script: string[], indices: number[], rejected: number[], currentIdx: number) => {
    setQuestionScript(script);
    setSelectedIndices(indices);
    setRejectedIndices(rejected);
    setCurrentIndex(currentIdx);
    setCurrentView("sentence");
  }, []);

  const handleSpeakSentenceRef = useCallback((fn: (index: number, script: string[], voiceType: string) => void) => {
    setSpeakSentence(() => fn);
  }, []);

  // ============================================================
  // ORİJİNAL ANALİZ ALGORİTMASI – 16 cümleyi harmanlayıp yeni mesaj üretir
  // ============================================================
  // Bu algoritma, kullanıcının seçtiği cümleleri (selected) ve reddettiklerini (rejected)
  // analiz ederek, seçilen cümlelerin tematik ağırlıklarına göre yepyeni, özgün bir mesaj sentezler.
  // Her cümle bir "karakter kodu" taşır ve bu kodların birleşiminden kişiye özel bir mesaj doğar.
  // ============================================================

  // Karakter kodları: her cümle tipi bir karakter özelliğini temsil eder
  const CHARACTER_CODES: Record<string, { trait: string; weight: number; archetype: string }> = {
    "güç":     { trait: "cesaret",    weight: 3, archetype: "Savaşçı" },
    "bilgelik": { trait: "derinlik",   weight: 3, archetype: "Bilge" },
    "aşk":     { trait: "şefkat",     weight: 2, archetype: "Sevgili" },
    "ölüm":    { trait: "dönüşüm",    weight: 2, archetype: "Rehber" },
    "umut":    { trait: "inanç",      weight: 2, archetype: "Hayalperest" },
    "karanlık":{ trait: "gizem",      weight: 2, archetype: "Gölge" },
    "ışık":    { trait: "aydınlanma", weight: 2, archetype: "Aydın" },
    "zaman":   { trait: "sabır",      weight: 1, archetype: "Bilge" },
    "değişim": { trait: "uyum",       weight: 2, archetype: "Dönüşen" },
    "savaş":   { trait: "mücadele",   weight: 2, archetype: "Savaşçı" },
    "barış":   { trait: "huzur",      weight: 2, archetype: "Barışçıl" },
    "kader":   { trait: "teslimiyet", weight: 1, archetype: "Kaderci" },
    "özgürlük":{ trait: "bağımsızlık",weight: 2, archetype: "Asi" },
    "sır":     { trait: "gizlilik",   weight: 1, archetype: "Gizemli" },
    "gökyüzü": { trait: "yükseklik",  weight: 1, archetype: "Hayalperest" },
    "toprak":  { trait: "köklenme",   weight: 1, archetype: "Kökten" },
  };

  // Sentez şablonları – her arketip için farklı bir açılış
  const ARKETIP_SABLONLARI: Record<string, string[]> = {
    "Savaşçı":   ["Gücünün farkına var.", "Mücadele seni şekillendiriyor.", "Cesaretin en büyük silahın."],
    "Bilge":     ["Derinlerde bir bilgelik yatıyor.", "Her soru bir cevap taşır.", "Bilmek, değişmektir."],
    "Sevgili":   ["Sevgi en büyük güçtür.", "Kalbinin sesini dinle.", "Şefkatle dokun hayata."],
    "Rehber":    ["Dönüşüm kaçınılmazdır.", "Her son yeni bir başlangıçtır.", "Ölüm bile bir öğretmendir."],
    "Hayalperest": ["Gökyüzü sınırsızdır.", "Hayallerin peşinden git.", "Umut en karanlık geceyi aydınlatır."],
    "Gölge":     ["Karanlıkta saklı gerçekler var.", "Gölgenle yüzleş.", "Bilinmeyen korkutucu ama özgürleştiricidir."],
    "Aydın":     ["Işık her zaman kazanır.", "Gerçeği görmek cesaret ister.", "Aydınlanma bir yolculuktur."],
    "Dönüşen":   ["Değişim kaçınılmazdır.", "Uyum sağlamak güçtür.", "Her dönüşüm bir arınmadır."],
    "Barışçıl":  ["Huzur içinde ol.", "Barış seninle başlar.", "Sakinlik en büyük erdemdir."],
    "Kaderci":   ["Kaderine güven.", "Her şey bir sebeple olur.", "Teslimiyet bir zayıflık değildir."],
    "Asi":       ["Özgürlük senin doğan.", "Kuralları sorgula.", "Bağımsızlık en büyük hazine."],
    "Gizemli":   ["Her sır bir kapı açar.", "Bilinmeyenin peşinden git.", "Gizem seni çağırıyor."],
    "Kökten":    ["Köklerine sıkı sarıl.", "Toprak ana seni besler.", "Sağlam temel her şeydir."],
  };

  // Varsayılan şablon
  const DEFAULT_SABLON = [
    "İç sesini dinle.",
    "Yolun açık olsun.",
    "Her an bir fırsattır.",
  ];

  // Ana sentez fonksiyonu
  const handleSentenceFinish = useCallback((selected: number[], rejected: number[], script: string[]) => {
    const selectedPhrases = selected.map(i => script[i]).filter(Boolean);
    const rejectedPhrases = rejected.map(i => script[i]).filter(Boolean);

    // 1. Seçilen cümlelerdeki karakter kodlarını tara
    const activeTraits: { trait: string; weight: number; archetype: string }[] = [];
    const activeArchetypes: Record<string, number> = {};

    selectedPhrases.forEach(phrase => {
      const lower = phrase.toLowerCase();
      Object.entries(CHARACTER_CODES).forEach(([keyword, code]) => {
        if (lower.includes(keyword)) {
          activeTraits.push(code);
          activeArchetypes[code.archetype] = (activeArchetypes[code.archetype] || 0) + code.weight;
        }
      });
    });

    // 2. Reddedilen cümlelerdeki kodları tersine çevir (negatif ağırlık)
    rejectedPhrases.forEach(phrase => {
      const lower = phrase.toLowerCase();
      Object.entries(CHARACTER_CODES).forEach(([keyword, code]) => {
        if (lower.includes(keyword)) {
          activeArchetypes[code.archetype] = (activeArchetypes[code.archetype] || 0) - code.weight;
        }
      });
    });

    // 3. En baskın arketipi bul
    let dominantArchetype = "Bilge";
    let maxWeight = 0;
    Object.entries(activeArchetypes).forEach(([archetype, weight]) => {
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantArchetype = archetype;
      }
    });

    // 4. Baskın arketipe göre şablon seç
    const sablonlar = ARKETIP_SABLONLARI[dominantArchetype] || DEFAULT_SABLON;

    // 5. Seçilen cümlelerden rastgele 2-3 anahtar kelime çek
    const allWords = selectedPhrases
      .join(" ")
      .split(/\s+/)
      .filter(w => w.length > 3)
      .map(w => w.replace(/[.,!?;:]/g, ""));
    const uniqueWords = [...new Set(allWords)];
    const shuffledWords = [...uniqueWords].sort(() => Math.random() - 0.5);
    const keyWords = shuffledWords.slice(0, Math.min(3, shuffledWords.length));

    // 6. Yeni mesajı sentezle: şablon cümleleri + anahtar kelimelerle zenginleştir
    const shuffledSablon = [...sablonlar].sort(() => Math.random() - 0.5);
    const selectedSablon = shuffledSablon.slice(0, Math.min(3, shuffledSablon.length));

    let newMessage = selectedSablon.join(" ");

    // Anahtar kelime varsa son cümleye ekle
    if (keyWords.length > 0) {
      const keywordPhrase = keyWords.join(", ");
      newMessage += ` ${keywordPhrase} yolculuğunun bir parçası.`;
    }

    // 7. Eğer hiçbir şey üretilemediyse fallback
    if (!newMessage || newMessage.trim().length < 10) {
      const fallbackSentences = [
        "Seçimlerinle oluşturduğun bu mesaj, senin iç dünyanın bir yansımasıdır.",
        "Her seçim bir karakteri, her karakter bir kaderi şekillendirir.",
        "Bu cümleler senin bilinçaltının derinliklerinden gelen fısıltılardır.",
        "Dinle, anla ve yoluna devam et. Çünkü her mesaj, senin bir parçandır.",
      ];
      newMessage = fallbackSentences.join(" ");
    }

    // 8. localStorage'a kaydet
    try {
      localStorage.setItem(
        "preGeneratedMessage",
        JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          message: newMessage,
          archetype: dominantArchetype,
          traits: activeTraits.map(t => t.trait),
          keyWords,
        })
      );
    } catch {}

    // 9. Home'a yönlendir
    setCurrentView("home");
  }, []);

  // ============================================================
  // SABAH BİLDİRİMİ ZAMANLAYICI (Günde 1 kere – saat 07:00)
  // ============================================================
  useEffect(() => {
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
            { id: 905 }, { id: 1005 }, { id: 1105 },
            { id: 705 }, { id: 805 },
            { id: 2145 }, { id: 2200 }, { id: 2215 },
            { id: 2245 }, { id: 2300 }, { id: 2315 },
            { id: 2320 }, { id: 2335 }, { id: 2350 },
            { id: 2338 }, { id: 2343 }, { id: 2348 }
          ]
        });

        // Günde 1 kere – saat 07:00'de bildirim
        await LocalNotifications.schedule({
          notifications: [{
            id: 700,
            title: "Nefertiti",
            body: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
            largeBody: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
            summaryText: "Duy Beni",
            schedule: {
              on: { hour: 7, minute: 0 },
              allowWhileIdle: true
            },
            sound: "beep.wav",
            attachments: undefined,
            actionTypeId: "",
            channelId: "duybeni_channel",
            extra: { url: "/?autoPlay=true" }
          }]
        });

        console.log('✅ Local notification scheduled for 07:00 (1 notification per day)');
      } catch (err) {
        console.warn('LocalNotifications setup failed:', err);
      }
    };

    setupLocalNotifications();
  }, []);

  return (
    <div className="app relative h-full w-full">
      {/* Tüm sayfalarda sabit alt navigasyon */}
      <BottomNav onNavigate={handleNavigate} />

      {/* ANA SAYFA - Mesaj (WhatsApp motoru) */}
      {(currentView === "home" || currentView === "index") && (
        <Mesaj
          onNavigate={handleNavigate}
          volume={volume}
          onVolumeChange={(vol) => {
            setVolume(vol);
            localStorage.setItem("volume", vol.toString());
          }}
        />
      )}

      {currentView === "nasil" && (
        <Nasil
          volume={volume}
          onClose={handleBack}
        />
      )}

      {currentView === "klan" && (
        <Klanim
          isPlaying={isPlaying}
          volume={volume}
          onStopAudio={() => setIsPlaying(false)}
          onViewChange={setCurrentView}
        />
      )}

      {currentView === "sentence" && (
        <Cümleler
          questionScript={questionScript}
          selectedIndices={selectedIndices}
          rejectedIndices={rejectedIndices}
          currentIndex={currentIndex}
          speakSentence={speakSentence}
          onBack={handleBack}
          onNavigate={handleNavigate}
          onAccept={(index: number) => {
            setSelectedIndices([...selectedIndices, index]);
            setCurrentIndex(index + 1);
          }}
          onReject={(index: number) => {
            setRejectedIndices([...rejectedIndices, index]);
            setCurrentIndex(index + 1);
          }}
          onFinish={handleSentenceFinish}
          volume={volume}
          onSpeakSentenceRef={handleSpeakSentenceRef}
        />
      )}
    </div>
  );
};

export default App;
