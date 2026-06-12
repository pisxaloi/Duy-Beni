// generateLocalMessage için test - eylem kategorilerine ayrılmış versiyon
function seededRandom(s) {
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

function generateLocalMessage(seed) {
  const rand = seededRandom(seed);

  // KATEGORİ 1: İLETİŞİM / SOSYAL
  const sosyalKategori = [
    { eylem: "mesaj at", hedefler: ["bir arkadaşına", "ailenden birine", "özlediğine", "teşekkür etmek istediğine", "uzun zamandır görmediğin birine"], gerekceler: ["kopmuş bir bağı geri getirebilir", "bir cümle bir ömür hatırlanır", "iyi ki var dediğin anları çoğaltır", "basit bir cümle bazen her şeyi değiştirir", "söylemediğin her şey seni yalnızlaştırır"] },
    { eylem: "ara", hedefler: ["bir arkadaşını", "ailenden birini", "özlediğin birini", "merak ettiğin birini", "sesini duymak istediğin birini"], gerekceler: ["bir ses duymak bazen bin kelimeden iyidir", "özlediğini söylemek için bugün doğru gün", "kısa bir arama uzun bir sessizliği bitirebilir", "merak ettiğini belli etmek bağları güçlendirir"] },
    { eylem: "teşekkür et", hedefler: ["bir arkadaşına", "ailenden birine", "sana iyilik yapmış olana", "minnettar olduğun birine", "yanında olana"], gerekceler: ["minnettarlık karşındakini olduğu kadar seni de iyileştirir", "bir teşekkür iki gönlü birleştirir", "küçük bir hareket büyük dalga başlatır", "iyi ki var dediğin anları çoğaltır"] },
    { eylem: "özür dile", hedefler: ["kırdığın birinden", "küstüğün birinden", "sessiz kaldığın birinden", "affetmek istediğin birinden", "senden uzaklaşmış olandan"], gerekceler: ["affetmek karşıdaki için değil kendin içindir", "söylemediğin pişmanlık söylediğinden daha ağır basar", "bir adım geri atmak iki adım ileri için fırsattır", "durmak da bir eylemdir"] },
    { eylem: "söyle", hedefler: ["bir arkadaşına", "ailenden birine", "sevdiğine", "içinden geçeni", "uzun zamandır söyleyemediğini"], gerekceler: ["söylemekten korktuğun şey tam da söylenmesi gereken şeydir", "doğru kelime yanlış zamanda bile iyileştirir", "bir soru bir duvarı yıkabilir", "içinden gelen ses genellikle doğru olanı söyler"] },
    { eylem: "sor", hedefler: ["merak ettiğin bir şeyi", "bir arkadaşına", "kendine", "bilmediğin bir şeyi", "içini kemiren soruyu"], gerekceler: ["bir soru bir duvarı yıkabilir", "bilmediğini kabul etmek öğrenmenin ilk adımıdır", "merak ettiğin şey seni büyütür", "soruların cevabı sorunun kendi içindeki sessizlikte gizlidir"] },
    { eylem: "gönder", hedefler: ["bir arkadaşına", "ailenden birine", "bir notu", "bir fotoğrafı", "bir hatırayı"], gerekceler: ["küçük bir hareket büyük dalga başlatır", "bir cümle bir ömür hatırlanır", "paylaşmak çoğaltır", "hatırladıkların şekillendirir"] },
    { eylem: "paylaş", hedefler: ["bir arkadaşınla", "ailenle", "bir anını", "bir düşünceyi", "bir duyguyu"], gerekceler: ["mutluluk paylaşıldıkça çoğalır", "üzüntü paylaşıldıkça azalır", "paylaşmak çoğaltır", "iyi ki var dediğin anları çoğaltır"] },
  ];

  // KATEGORİ 2: İÇSEL / ZİHİNSEL
  const zihinselKategori = [
    { eylem: "düşün", hedefler: ["bir kararı", "bir anıyı", "bir hayali", "bir soruyu", "bugünü"], gerekceler: ["düşünmek hareketsizliğin en aktif halidir", "kendine sorduğun her soru seni biraz daha özgürleştirir", "boşluk beyninin sıfırlanma anıdır", "içgörü sessizlikte filizlenir"] },
    { eylem: "hatırla", hedefler: ["güzel bir anıyı", "bir dersi", "bir yüzü", "bir duyguyu", "nereden geldiğini"], gerekceler: ["hatırladıkların şekillendirir", "geçmişte kalan bazı versiyonların hâlâ içinde yaşar", "unutmak da bir tür özgürlüktür", "anılar geleceğin tohumlarıdır"] },
    { eylem: "unut", hedefler: ["bir kırgınlığı", "bir hatayı", "geçmişte kalmış bir anı", "seni yoran bir düşünceyi", "affettiğin bir şeyi"], gerekceler: ["unutmak da bir tür özgürlüktür", "unuttuğun şeyler seni yormaz", "hafiflemek de bir eylemdir", "affetmek karşıdaki için değil kendin içindir"] },
    { eylem: "affet", hedefler: ["kendini", "kırdığın birini", "seni kıranı", "geçmişte takılı kaldığın bir anı", "içindeki çocuğu"], gerekceler: ["affetmek karşıdaki için değil kendin içindir", "hafiflemek de bir eylemdir", "geçmişte kalan bazı versiyonların hâlâ içinde yaşar", "karanlık taraflarını kabul eden bütünlüğe bir adım yaklaşır"] },
    { eylem: "karar ver", hedefler: ["bir konuda", "bir seçim yapmaya", "bir yön belirlemeye", "bir şeyi bitirmeye", "bir şeye başlamaya"], gerekceler: ["karar vermek harekete geçmenin ilk adımıdır", "seçim yapmamak da bir seçimdir", "her bitiş gizli bir başlangıcın habercisidir", "başlamak bitirmenin yarısıdır"] },
    { eylem: "kabul et", hedefler: ["bir gerçeği", "bir duyguyu", "bir durumu", "kendini", "değiştiremeyeceğin bir şeyi"], gerekceler: ["kabul etmek direnmeyi bırakmaktır", "kendi zayıflığını kabul etmek en büyük cesarettir", "karanlık taraflarını kabul eden bütünlüğe bir adım yaklaşır", "durmak da bir eylemdir"] },
    { eylem: "reddet", hedefler: ["seni tüketen bir alışkanlığı", "hayır demen gereken bir şeyi", "bir beklentiyi", "zoraki bir kabullenişi", "içine sinmeyen bir teklifi"], gerekceler: ["hayır demek kendine evet demenin tek yoludur", "seni tüketen şey evet demek zorunda hissetmendir", "kesmek devam etmekten bazen daha iyidir", "vazgeçmek bazen kazanmaktır"] },
    { eylem: "seç", hedefler: ["bir yönü", "bir yolu", "bir duruşu", "kendini", "seni mutlu edecek olanı"], gerekceler: ["seçim yapmamak da bir seçimdir", "her bitiş gizli bir başlangıcın habercisidir", "karar vermek harekete geçmenin ilk adımıdır", "başlamak bitirmenin yarısıdır"] },
    { eylem: "bekle", hedefler: ["doğru zamanı", "bir cevabı", "sabretmeyi", "bir işaret", "içindeki sesi"], gerekceler: ["beklemek de harekete geçmek kadar güçlüdür", "sabır acıyı tatlandırır", "boşluk beyninin sıfırlanma anıdır", "zaman insanın olgunlaşması için gereken bir araçtır"] },
    { eylem: "vazgeç", hedefler: ["seni yoran bir uğraştan", "bir inadından", "bir alışkanlığından", "bir takıntından", "kontrol etmeye çalıştığın bir şeyden"], gerekceler: ["vazgeçmek kaybetmek değil yön değiştirmektir", "vazgeçmek bazen kazanmaktır", "kesmek devam etmekten bazen daha iyidir", "hafiflemek de bir eylemdir"] },
    { eylem: "dene", hedefler: ["yeni bir şeyi", "farklı bir yaklaşımı", "cesaret ettiğin bir şeyi", "ertelediğin bir şeyi", "korktuğun bir şeyi"], gerekceler: ["cesaret korkuyu hissetmek ve yine de yürümektir", "başlamak bitirmenin yarısıdır", "yanılmak doğruyu bulmanın tek yoludur", "düşmek kalkmayı öğretir"] },
  ];

  // KATEGORİ 3: FİZİKSEL / BEDENSEL
  const fizikselKategori = [
    { eylem: "yürü", hedefler: ["bir süre", "biraz", "dışarıda", "düşüncelerinle", "hiçbir yere varmadan"], gerekceler: ["koşmak zorunda değilsin yürümek de varmak demektir", "bir adım geri atmak iki adım ileri için fırsattır", "hareket etmek zihni açar", "dışarıdaki her şey bir süre sonra seninle ilgili olmaktan çıkar"] },
    { eylem: "nefes al", hedefler: ["derin derin", "birkaç kere", "yavaşça", "farkındalıkla", "sakinleşene kadar"], gerekceler: ["nefes almak yaşadığının kanıtıdır", "derin nefes almak yaşamak istediğinin kanıtıdır", "boşluk beyninin sıfırlanma anıdır", "durmak da bir eylemdir"] },
    { eylem: "otur", hedefler: ["sessizce", "bir süre", "kendinle", "düşüncelerinle", "hiçbir şey yapmadan"], gerekceler: ["durmak da bir eylemdir", "boşluk beyninin sıfırlanma anıdır", "sessizlik bir boşluk değil bir cevaptır", "içgörü sessizlikte filizlenir"] },
    { eylem: "kalk", hedefler: ["ve bir şey yap", "ve hareket et", "ve başla", "ve devam et", "ve dene"], gerekceler: ["başlamak bitirmenin yarısıdır", "hareket etmek zihni açar", "kalkmak düşmüş olmayı unutturur", "devam etmek bitirmiş olmaktır"] },
    { eylem: "gülümse", hedefler: ["kendine", "bir yabancıya", "bugüne", "hayata", "içindeki çocuğa"], gerekceler: ["bir gülümseme savaşı bitirebilir", "küçük bir hareket büyük dalga başlatır", "gülümsemek en basit iyilik hareketidir", "içimizdeki çocuk en saf bakış açısıdır"] },
    { eylem: "dur", hedefler: ["bir an", "ve etrafına bak", "ve dinle", "ve fark et", "ve nefes al"], gerekceler: ["durmak da bir eylemdir", "bir an durup bakmak en büyük keşiftir", "hız fark etmeyi engeller", "boşluk beyninin sıfırlanma anıdır"] },
    { eylem: "bak", hedefler: ["etrafına", "gökyüzüne", "bir an", "derinlemesine", "fark etmediklerine"], gerekceler: ["bir an durup bakmak en büyük keşiftir", "gökyüzü senin aynandır", "hız fark etmeyi engeller", "küçük şeylerdeki büyük resmi görmek olgunluktur"] },
    { eylem: "dinle", hedefler: ["bir şarkıyı", "sessizliği", "bir dostu", "iç sesini", "doğanın sesini"], gerekceler: ["sessizlikte konuşan ses en gerçek sestir", "dışarıdaki gürültü dinince içerideki netleşir", "dinlemek anlamanın ilk adımıdır", "sessizlik bir boşluk değil bir cevaptır"] },
    { eylem: "yaz", hedefler: ["bir mektup", "bir şiir", "bir günlük", "içinden geçenleri", "bir teşekkür notu"], gerekceler: ["bir cümle bir ömür hatırlanır", "yazmak düşünceleri netleştirir", "söylemediğin her şey seni yalnızlaştırır", "basit bir cümle bazen her şeyi değiştirir"] },
    { eylem: "sil", hedefler: ["bir fotoğrafı", "bir mesajı", "bir numarayı", "bir hatırayı", "geçmişin izlerini"], gerekceler: ["silmek taşımaktan daha cesurcadır", "hafiflemek de bir eylemdir", "eskiyi bitirmeden yeniye yer açılamaz", "unutmak da bir tür özgürlüktür"] },
  ];

  // KATEGORİ 4: DÖNÜŞÜM / DEĞİŞİM
  const donusumKategori = [
    { eylem: "değiştir", hedefler: ["bir alışkanlığını", "bir bakış açını", "bir rutinini", "küçük bir şeyi", "başlamak istediğin bir şeyi"], gerekceler: ["değişmek zorundasın çünkü her şey değişiyor", "farkına vardığın alışkanlıkları değiştirebilirsin", "değişimden korkmak hayattan korkmaktır", "dönüşüm sancılı ama kaçınılmaz bir süreçtir"] },
    { eylem: "başla", hedefler: ["küçük bir adımla", "ertelediğin bir şeye", "yeni bir alışkanlığa", "bir günlük tutmaya", "bir projeye"], gerekceler: ["başlamak bitirmenin yarısıdır", "her başlangıç bir önceki bitişi gerektirir", "küçük bir hareket büyük dalga başlatır", "her bitiş gizli bir başlangıcın habercisidir"] },
    { eylem: "devam et", hedefler: ["yoluna", "bildiğin gibi", "vazgeçmeden", "bir gün daha", "yavaş da olsa"], gerekceler: ["devam etmek bitirmiş olmaktır", "koşmak zorunda değilsin yürümek de varmak demektir", "insan bir nehir gibi kendi yolunu eninde sonunda bulur", "yolunu kucaklayan fırtınanın ortasında bile huzuru bulur"] },
    { eylem: "bırak", hedefler: ["kontrol etmeyi", "endişelenmeyi", "bir yükü", "geçmişi", "olması gerektiği gibi olmayanı"], gerekceler: ["vazgeçmek kaybetmek değil yön değiştirmektir", "hafiflemek de bir eylemdir", "esnek ol ki fırtınalarda kırılmayasın", "direndiğin şey varlığını sürdürmeye devam eder"] },
    { eylem: "dönüş", hedefler: ["kendine", "özüne", "bir başlangıca", "bir eskiye", "bir yuvaya"], gerekceler: ["kendi küllerinden doğmak her insanın doğasında vardır", "insan her krizde eski derisini atıp yenilenir", "her bitiş gizli bir başlangıcın habercisidir", "dönüşüm sancılı ama kaçınılmaz bir süreçtir"] },
  ];

  // KATEGORİ 5: BAKIM / TEMİZLİK / DÜZEN
  const bakimKategori = [
    { eylem: "temizle", hedefler: ["bir odayı", "masanı", "zihnini", "bir alanı", "dağınıklığı"], gerekceler: ["temizlik zihni de temizler", "düzen dışarıdan içeriye doğru işler", "boşluk beyninin sıfırlanma anıdır", "küçük bir hareket büyük dalga başlatır"] },
    { eylem: "düzenle", hedefler: ["bir alanı", "bir listeyi", "önceliklerini", "bir dolabı", "dağınık düşüncelerini"], gerekceler: ["düzen dışarıdan içeriye doğru işler", "temizlik zihni de temizler", "plan yapmak geleceği şimdiden yaşamaktır", "küçük şeylerdeki büyük resmi görmek olgunluktur"] },
    { eylem: "kontrol et", hedefler: ["bir şeyi", "bir detayı", "bir tarihi", "bir durumu", "bir planı"], gerekceler: ["fark etmeyi sağlar", "düzen dışarıdan içeriye doğru işler", "küçük şeylerdeki büyük resmi görmek olgunluktur", "plan yapmak geleceği şimdiden yaşamaktır"] },
    { eylem: "yıka", hedefler: ["ellerini", "bir bardağı", "bir tabağı", "bir kıyafeti", "bir pencereyi"], gerekceler: ["temizlik zihni de temizler", "küçük bir hareket büyük dalga başlatır", "düzen dışarıdan içeriye doğru işler", "basit bir iş zihni boşaltır"] },
  ];

  // KATEGORİ 6: DURGUNLUK / KABULLENİŞ
  const durgunlukKategori = [
    { eylem: "sus", hedefler: ["bir süre", "gereksiz yere", "dinlemek için", "anlamak için", "iç sesini duymak için"], gerekceler: ["sessizlik bazen en güçlü cevaptır", "sessizlik bir boşluk değil bir cevaptır", "dinlemek anlamanın ilk adımıdır", "içgörü sessizlikte filizlenir"] },
    { eylem: "bekle", hedefler: ["doğru anı", "bir cevabı", "sabırla", "bir işareti", "içindeki sesi"], gerekceler: ["beklemek de harekete geçmek kadar güçlüdür", "sabır acıyı tatlandırır", "zaman insanın olgunlaşması için gereken bir araçtır", "her şeyi çözmek zorunda değilsin"] },
    { eylem: "dinlen", hedefler: ["biraz", "bir süre", "zihnini", "bedenini", "kendine izin vererek"], gerekceler: ["durmak da bir eylemdir", "kısa bir ara uzun bir yolun parçasıdır", "boşluk beyninin sıfırlanma anıdır", "kendine ayırdığın 1 dakika kimseye ayıramayacağın bir hediyedir"] },
    { eylem: "bırak", hedefler: ["akışına", "olduğu gibi", "kontrolü", "endişeyi", "mükemmeliyetçiliği"], gerekceler: ["bazen en iyi plan plansızlıktır", "esnek ol ki fırtınalarda kırılmayasın", "direndiğin şey varlığını sürdürmeye devam eder", "her şeyi çözmek zorunda değilsin"] },
  ];

  // Tüm kategorileri birleştir
  const tumKategoriler = [
    ...sosyalKategori,
    ...zihinselKategori,
    ...fizikselKategori,
    ...donusumKategori,
    ...bakimKategori,
    ...durgunlukKategori,
  ];

  // === KANT FİLTRESİ ===
  const fizikselEylemler = new Set([
    "koş", "dans et", "yürü", "esne", "kalk", "zıpla",
    "çık dışarı", "yıka", "temizle", "kucakla", "sarıl",
    "ek", "sula", "bakım yap", "onar", "dokun",
  ]);
  const lokasyonHedefleri = new Set([
    "bir parkta", "bir ormana", "deniz kenarına", "bir tepeye",
    "bir sahili", "bir su kaynağını", "bir parka", "bir bankta",
    "bir manzaraya", "bir çiçeğe", "bir ağaca", "bir yaprağa",
    "bir taşa", "bir suya", "bir çiçek", "bir ağaç", "bir tohum",
    "bir bitki", "bir bitkiye", "bir hayvana",
    "dışarıda", "bir parkı", "bir ormanı", "çevreni",
    "mutfakta", "bir pencerenin önünde",
  ]);
  const ekipmanEylemleri = new Set([
    "mesaj at", "ara", "gönder", "yaz", "sil",
  ]);

  // Kant filtresi ile seçim döngüsü
  let secili = null;
  let hedef = "";
  let gerekce = "";
  for (let deneme = 0; deneme < 50; deneme++) {
    const aday = tumKategoriler[Math.floor(rand() * tumKategoriler.length)];
    const adayHedef = aday.hedefler[Math.floor(rand() * aday.hedefler.length)];
    const adayGerekce = aday.gerekceler[Math.floor(rand() * aday.gerekceler.length)];

    const eylemFiziksel = fizikselEylemler.has(aday.eylem);
    const hedefLokasyon = lokasyonHedefleri.has(adayHedef);
    const eylemEkipman = ekipmanEylemleri.has(aday.eylem);

    // REDDET: fiziksel eylem + lokasyon hedefi
    if (eylemFiziksel && hedefLokasyon) continue;

    secili = aday;
    hedef = adayHedef;
    gerekce = adayGerekce;
    break;
  }

  if (!secili) {
    secili = tumKategoriler[Math.floor(rand() * tumKategoriler.length)];
    hedef = secili.hedefler[Math.floor(rand() * secili.hedefler.length)];
    gerekce = secili.gerekceler[Math.floor(rand() * secili.gerekceler.length)];
  }

  // === CÜMLE AKIŞI FİLTRESİ ===
  const eylemHedefUzunlugu = secili.eylem.length + hedef.length;
  const kisaKombinasyon = eylemHedefUzunlugu < 25;

  // === TÜRKÇE CÜMLE YAPISI DÜZELTMESİ ===
  // Türkçe SOV (Subject-Object-Verb) dilidir:
  //   Özne başta, NESNE ortada, FİİL SONDA.
  // Normalde: nesne (hedef) önce, fiil (eylem) sonra
  //   Örn: "bir hikaye dinle" = hedef + eylem
  // İstisna: "ve " ile başlayan hedefler (örn: "ve bir şey yap")
  //   Örn: "kalk ve bir şey yap" = eylem + hedef (değişmez)
  const hedefVeIleBasliyor = hedef.startsWith("ve ");
  // Normal: nesneOnce=hedef, fiilSonra=secili.eylem → "bir hikaye dinle"
  // "ve":   nesneOnce=secili.eylem, fiilSonra=hedef → "kalk ve bir şey yap"
  const nesneOnce = hedefVeIleBasliyor ? secili.eylem : hedef;
  const fiilSonra = hedefVeIleBasliyor ? hedef : secili.eylem;

  // Akıcı, doğal cümle kalıpları — TÜRKÇE SOV KURALINA UYGUN
  // Farklı başlangıçlarla çeşitlendirildi (sadece "Bugün" değil)
  const kaliplar = [
    // === "Bugün" ile başlayanlar (günlük) ===
    (eylem, hedef, gerekce) => `Bugün ${nesneOnce} ${fiilSonra}. Çünkü ${gerekce}.`,
    (eylem, hedef, gerekce) => `Bugün ${nesneOnce} ${fiilSonra} — ${gerekce}.`,
    (eylem, hedef, gerekce) => `Bugün için bir öneri: ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Belki bugün ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Sana bugünkü önerim: ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Bugün bir fırsat yarat: ${nesneOnce} ${fiilSonra}. ${gerekce}.`,

    // === "Bir an dur ve" ile başlayan (anlık farkındalık) ===
    (eylem, hedef, gerekce) => `Bir an dur ve ${nesneOnce} ${fiilSonra}. ${gerekce}.`,

    // === Zaman belirtmeyen başlangıçlar ===
    (eylem, hedef, gerekce) => `Şimdi ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Arada bir ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Bir ara ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Her gün ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Kendine bir iyilik yap: ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Günün bir anında ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Farkında mısın? ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Unutma: ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Belki de ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `İşte sana bir fikir: ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
    (eylem, hedef, gerekce) => `Haydi ${nesneOnce} ${fiilSonra}. ${gerekce}.`,
  ];

  const kullanilabilirKalipSayisi = kisaKombinasyon ? 12 : kaliplar.length;
  const kalip = kaliplar[Math.floor(rand() * kullanilabilirKalipSayisi)];
  let message = kalip(secili.eylem, hedef, gerekce);

  // Güvenlik kontrolü
  if (message.length > 250 || message.includes("undefined")) {
    message = "Bugün kendine iyi bak. Çünkü bunu yapacak başka kimse yok.";
  }

  return { message };
}

// 20 farklı seed ile test
console.log("=== generateLocalMessage - KATEGORİK VERSİYON TEST ===");
for (let i = 0; i < 20; i++) {
  const seed = i * 7 + 3;
  const result = generateLocalMessage(seed);
  console.log(`Seed ${String(seed).padStart(4, ' ')}: ${result.message}`);
}
