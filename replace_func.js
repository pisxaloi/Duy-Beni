const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// generateLocalMessage fonksiyonunun başlangıcı
const funcStart = `/**
 * Deterministik seed kullanarak yerel (AI'siz) ilham mesajı üretir.
 * 10 kategori, 70+ eylem, 300+ hedef ve 200+ gerekçe ile
 * 100.000'den fazla benzersiz kombinasyon üretir, tekrar riskini minimize eder.
 */
function generateLocalMessage(
  seed: number,
  _unasTexts: string[],
  _jungTexts: string[],
  _skipCombinations: string[] = []
): {
  message: string;
} {`;

const funcEnd = `  return { message };
}`;

const startIdx = content.indexOf(funcStart);
const endIdx = content.indexOf(funcEnd, startIdx) + funcEnd.length;

if (startIdx === -1 || endIdx === -1) {
  console.error('Fonksiyon bulunamadı!');
  process.exit(1);
}

const newFunction = `/**
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

    // Gemini'nin önerdiği yeni mesaj havuzu — 25 derin, Jung/Unas dokunuşlu mesaj
  const yeniMesajHavuzu = [
    {
      action: "Gün içinde bir karar alırken ya da birine cevap verirken 3 saniye dur ve bekle.",
      because: "Çünkü günlük hayatta takındığın maskeler (persona) bir süre sonra üzerine yapışır. Durduğunda, tepkini maskenin mi yoksa gerçek senin mi verdiğini fark edersin.",
      touch: "Maske takanlar sadece rüya görür, içeriye bakanlar uyanır."
    },
    {
      action: "Bugün bir konuda haklı olmak yerine anlayışlı olmayı seç.",
      because: "Çünkü haklı çıkmak egoyu besler, anlayışlı olmak ise bağı. Her tartışmada kazanan değil, öğrenen olmayı seçmek bilincin evrimleştiği andır.",
      touch: "Haklı olmak doğru olmak değildir; bazen susmak en büyük zaferdir."
    },
    {
      action: "Yapmak istemediğin bir işi hemen şimdi yap. Erteleme.",
      because: "Çünkü ertelenen her iş, zihninde bir yük olarak birikir. O yük, farkında olmasan da enerjini emer. Erteleme alışkanlığı, iradenin sessiz çürüyüşüdür.",
      touch: "Yapman gerekeni yapmamak, yapmış olmaktan daha ağırdır."
    },
    {
      action: "Telefonunu 1 saatliğine sessize al ve bir köşeye koy.",
      because: "Çünkü sürekli açık kanallar (bildirimler, mesajlar, akış) beynini başkalarının gündemine teslim eder. Sessizlik, kendi gündemini geri almandır.",
      touch: "Dışarıdaki gürültü dinince içerideki netleşir."
    },
    {
      action: "Birini yargılamak yerine onun yerine koy kendini. Sadece bir kez olsun.",
      because: "Çünkü yargı, bilinçdışının en kestirme yoludur. Oysa her insan, bilmediğin bir savaşın içindedir. Yargılamak yerine anlamaya çalışmak, gölgeni aydınlığa çevirir.",
      touch: "Yargıladığın her insan, aslında kendinde görmediğin bir parçandır."
    },
    {
      action: "Günlük rutininde küçük bir değişiklik yap. Farklı bir yoldan git, farklı bir kahve iç.",
      because: "Çünkü rutin, bilincin uyku halidir. Küçük bir değişiklik, beyni uyandırır ve yeni nöral bağlantılar kurar. Alışkanlıkların kölesi olmadığını hatırlamak özgürleştirir.",
      touch: "Değişim büyük adımlarla değil, küçük farkındalıklarla başlar."
    },
    {
      action: "Bir an için kontrolü bırak. Plan yapma, akışına izin ver.",
      because: "Çünkü kontrol arzusu, egonun en derin korkusundan doğar: belirsizlik korkusu. Oysa hayat, kontrol edemediğin yerlerde sana en büyük dersleri verir. Bırakmak, güvenmektir.",
      touch: "Kontrol etmeye çalıştığın her şey, aslında seni kontrol eder."
    },
    {
      action: "Bir bardak suyu farkındalıkla iç. Her yudumda suyun varlığını hisset.",
      because: "Çünkü farkındalık, sıradan olanı kutsala dönüştürür. Su içmek gibi basit bir eylem bile, bilinçli yapıldığında bir meditasyona dönüşür. An, küçük şeylerde saklıdır.",
      touch: "Kutsal olan su değil, onu fark eden bilinçtir."
    },
    {
      action: "Birine görünmez bir iyilik yap. Kimse bilmesin, sen de unut.",
      because: "Çünkü karşılık beklemeden yapılan iyilik, egonun değil ruhun dilidir. Beklenti olmayınca enerji saf kalır ve iyilik, yapanı da alanı da dönüştürür.",
      touch: "İyiliğin en saf hali, sağ elin verdiğini sol elin bilmediği zamandır."
    },
    {
      action: "Yürürken etrafındaki 3 farklı rengi fark et ve isimlendir.",
      because: "Çünkü zihnin sürekli geçmiş ya da gelecekte gezinir. Rengi fark etmek, seni şimdiye, yani gerçek olan tek ana çeker. Renkler, anın dilidir.",
      touch: "Farkındalık, sadece görmek değil; gördüğünü bilmektir."
    },
    {
      action: "Öfkelendiğinde dur ve kendine sor: 'Bu öfke bana ne söylüyor?'",
      because: "Çünkü öfke, çoğu zaman incinmiş egonun sesidir. Ama altında korku, hayal kırıklığı ya da çaresizlik yatar. Öfkeye tepki vermek yerine onu anlamak, gölgeni aydınlatır.",
      touch: "Öfke bir mesajdır, silah değil."
    },
    {
      action: "Bir saat boyunca hiçbir ekrana bakma. Kitap oku, yürü ya da sadece otur.",
      because: "Çünkü ekranlar, dikkatini çalan modern mağaralardır. Onlardan uzaklaştığında, kendi iç sesini yeniden duymaya başlarsın. O ses hep oradaydı, sadece duyamıyordun.",
      touch: "Gölgeler mağarasından çıkmak, gerçek ışığı görmektir."
    },
    {
      action: "Bir hayvanla göz teması kur ve onu gerçekten görmeye çalış.",
      because: "Çünkü hayvanlar, insanın en eski yoldaşlarıdır. Onlar yargılamaz, beklemez, sadece vardır. Onların gözlerine bakmak, insan olmayan bir bilinçle karşılaşmaktır.",
      touch: "Hayvanlar konuşmaz ama suskunlukları en büyük öğretidir."
    },
    {
      action: "Birine içten bir iltifat et. Üstelik bunu kimseye söyleme.",
      because: "Çünkü iltifat, karşındakinin görünmeyen bir yanını görmektir. Onu kimseye söylememek, o anı sadece seninle onun arasında bırakır. Görünmeyen bağlar, en güçlü bağlardır.",
      touch: "Görülmek, insanın en derin ihtiyacıdır."
    },
    {
      action: "Bir bitkiye, çiçeğe ya da ağaca dokun ve 1 dakika boyunca sadece onu izle.",
      because: "Çünkü doğa, insanın en eski aynasıdır. Ona dokunmak, kendi köklerine dokunmaktır. Modern dünya bu bağı kopardı; geri almak iyileştirir.",
      touch: "Toprakla bağı kopan, kendisiyle de bağ kuramaz."
    },
    {
      action: "Gün içinde bir kez olsun 'keşke' dememeye çalış.",
      because: "Çünkü 'keşke', geçmişe bağlı bir pişmanlık cümlesidir. O anı olduğu gibi kabul etmek, olana direnmemektir. Geçmişi değiştiremezsin ama ona verdiğin anlamı değiştirebilirsin.",
      touch: "'Keşke' dediğin her an, şimdiyi kaçırdığın andır."
    },
    {
      action: "Bugün bir şeyi bilinçli olarak yavaş yap. Acele etme.",
      because: "Çünkü hız, modern dünyanın en büyük bağımlılığıdır. Yavaşlamak, bilincin derinleşmesidir. Her şeyi hızlı yapmak, hiçbir şeyi tam yapmamaktır.",
      touch: "Yavaşlayan, daha çok görür."
    },
    {
      action: "Bir eleştiri aldığında savunmaya geçme. Sadece dinle ve düşün.",
      because: "Çünkü savunma, egonun otomatik tepkisidir. Oysa eleştiri, büyümenin en değerli araçlarından biridir. Savunmaya geçmeden dinlemek, alçakgönüllülüğün ve bilgeliğin işaretidir.",
      touch: "Eleştiri, büyümek isteyenler için bir armağandır."
    },
    {
      action: "Bugün birinin küçük bir detayını hatırla ve ona bundan bahset.",
      because: "Çünkü detayları hatırlamak, karşındakine gerçekten değer verdiğini gösterir. Küçük şeyler, büyük bağların temelidir. İnsanlar detaylarda saklıdır.",
      touch: "Büyük şeyler küçük detaylarda gizlidir."
    },
    {
      action: "Bugün verdiğin bir sözü tut. Küçük de olsa, mutlaka tut.",
      because: "Çünkü sözünü tutmak, karakterin temelidir. Küçük sözler, büyük güvenler inşa eder. Kendine verdiğin sözleri tutmak da en az başkalarına verdiklerin kadar önemlidir.",
      touch: "Söz, karakterin aynasıdır."
    },
    {
      action: "Aynaya bak ve kendi gözlerinin içine 30 saniye boyunca bak.",
      because: "Çünkü gözler, ruhun penceresidir. Kendi gözlerine bakmak, yargılamadan özünle yüzleşmektir. İlk 10 saniye rahatsız eder, sonraki 20 saniye özgürleştirir.",
      touch: "Kaçtığın her şey, aynada sana geri bakar."
    },
    {
      action: "Bir endişeni fark et ve ona bir isim ver. Sonra bırak gitmesine izin ver.",
      because: "Çünkü endişe, zihnin gelecekteki felaket senaryolarına takılıp kalmasıdır. Onu fark etmek ve isimlendirmek, ona olan gücünü geri almandır. İsimlendirilen duygu, kontrol edilebilir hale gelir.",
      touch: "Endişe, zihnin kendi kendine anlattığı bir hikayedir."
    },
    {
      action: "Bugün birinden yardım iste. Küçük bir şey için bile olsa.",
      because: "Çünkü yardım istemek, zayıflık değil, güçlü olmanın farklı bir halidir. Her şeyi tek başına yapmaya çalışmak, egonun yalnızlık yeminidir. Yardım istemek, bağ kurmaktır.",
      touch: "Yardım istemek, gücünü değil, insan olduğunu gösterir."
    },
    {
      action: "Zihninde dönen bir düşünceyi fark et ve onu sadece izle. Yargılama, değiştirme.",
      because: "Çünkü düşünceler, bilincin yüzeyindeki dalgalardır. Onları yargılamadan izlemek, meditasyonun özüdür. Düşüncelerinle özdeşleşmediğinde, gerçek özgürlük başlar.",
      touch: "Sen düşüncelerin değilsin; onları izleyen bilinçsin."
    },
    {
      action: "Bugün iki eylem arasında bir boşluk bırak. Acele etme, geçişi hisset.",
      because: "Çünkü hayat, eylemler arasındaki boşluklarda gizlidir. Sürekli yapmak, olmayı unutturur. İki eylem arasındaki boşluk, nefes almak ve sadece var olmak içindir.",
      touch: "Boşluk, yokluk değil; var olmanın en saf halidir."
    },
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
  ];  // Seed'e göre deterministik seçim
  const index = Math.abs(seed) % yeniMesajHavuzu.length;
  const seciliMesaj = yeniMesajHavuzu[index];
  const finalMessage = \`\${seciliMesaj.action}\n\n\${seciliMesaj.because}\n\nUnutma; \${seciliMesaj.touch}\`;

  return { message: finalMessage };
}`;

content = content.slice(0, startIdx) + newFunction + content.slice(endIdx);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fonksiyon başarıyla değiştirildi!');
