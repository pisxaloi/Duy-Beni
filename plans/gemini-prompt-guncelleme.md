# Günlük İlham Ajanı - Algoritma Değişikliği

## Amaç
Ana sayfadaki günlük mesaj üretme algoritmasını (Gemini/DeepSeek prompt'u ve local fallback) tamamen yenilemek. Eski mistik Mısır+Jung temalı 6 alanlı yapı kaldırıldı, yerine sade ve doğrudan "Günlük İlham Ajanı" formatı getirildi.

## Eski Sistem (KALDIRILDI)
- **Tema**: Antik Mısır (Unas Piramit Metinleri) + Carl Jung psikolojisi
- **Çıktı**: 6 alanlı JSON (`ancientSymbol`, `ancientMeaning`, `jungNote`, `shadowReveal`, `modernBridge`, `dailyAction`)
- **Ton**: Mistik, bilge, sembolik, ağır
- **Yasaklı olmayan**: piramit, kadim, gölge, arketip, bilinçdışı gibi kelimeler serbestçe kullanılıyordu

## Yeni Sistem (UYGULANDI)
- **Tema**: Günlük İlham Ajanı - sade, doğrudan, arkadaş tavsiyesi
- **Çıktı**: Tek alanlı JSON (`{ "message": "..." }`)
- **Ton**: Hafif, eyleme çağıran, anlaşılır
- **Kantçı Etik Filtre** (3 filtre):
  - **Filtre 1 - Evrensellik**: Eylem dünyadaki herkes tarafından yapılabilir olmalı (kulaklık, kahve, araba gibi ekipman varsayılmamalı)
  - **Filtre 2 - Ekipman Varsayımı**: Kullanıcının sahip olmayabileceği hiçbir şey varsayılmamalı (kulaklık, araba, kahve, telefon, sağlıklı bacaklar, ev, iş, para, boş zaman yasak)
  - **Filtre 3 - Yapılabilirlik Süresi**: Eylem 30 saniye - 3 dakika arası, maksimum 5 dakika
- **Kurallar**:
  - Tek cümle: "Bugün [EYLEM]. Çünkü [GEREKÇE]."
  - Eylem 30 saniye - 3 dakika arasında yapılabilir olmalı
  - Toplam 10-25 kelime
- **Güvenli mesaj** (filtreleri geçen yoksa): "Bugün kendine iyi bak. Çünkü bunu yapacak başka kimse yok."
- **Yasaklı kelimeler**: piramit, kadim, maske, rüya, gölge, yankılanmak, dikilmek, arketip, bilinçdışı, içeri/dışarı bakan, uyanış, aydınlanma
- **Yasaklı tonlar**: Üstten konuşan bilge tonu, korkutucu ifadeler, anlaşılmaz metaforlar

## Değişiklik Özeti

### 1. `dailyMessage` State Tipi (src/App.tsx:681)
**Eski**: 6 alanlı interface (`ancientSymbol`, `ancientMeaning`, `jungNote`, `shadowReveal`, `modernBridge`, `dailyAction`)
**Yeni**: Tek alan `{ message: string } | null`

### 2. `responseSchema` (src/App.tsx:1775)
**Eski**: 4 alanlı (`dailyAction`, `modernBridge`, `ancientSymbol`, `shadow_reveal`)
**Yeni**: Tek alanlı (`message`)

### 3. `systemPrompt` (src/App.tsx:1836)
**Eski**: Mısır+Jung mistik prompt'u
**Yeni**: "Günlük İlham Ajanı" prompt'u - eylem + gerekçe formatı, yasaklı kelimeler, örnekler
**Yeni (v2 - Havuz Genişletme)**: 4 tablo (100 eylem + 100 hedef + 10 zaman + 200 gerekçe) eklendi. AI artık bu tablolardan seçim yaparak 15.000+ kombinasyon üretebilir.

### 4. `generateLocalMessage` (src/App.tsx:299)
**Eski**: Unas/Jung/shadow/symbol/bridge/action şablonları (6 alan)
**Yeni (v1)**: 15 adet eylem+gerekçe mesaj şablonu, `{ message: string }` döndürür
**Yeni (v2 - Havuz Genişletme)**: 4 tablodan (100 eylem + 100 hedef + 10 zaman + 200 gerekçe) seed'li random kombinasyon üreten algoritma. `seededRandom` fonksiyonu ile deterministik seçim. `eylemHedefUyumu` fonksiyonu ile eylem+hedef uyumu sağlanır.

### 5. AI Yanıt İşleme (src/App.tsx:1829)
**Eski**: `resData.ancientSymbol`, `resData.modernBridge`, `resData.shadow_reveal`, `resData.dailyAction`
**Yeni**: `resData.message`

### 6. UI Render (src/App.tsx:3372)
**Eski**: 4 bölümlü kart (🏛️ Kadim Anlam, 🌑 Jung Notu, 🌉 Köprü Sorusu, 👁️ Gölge Keşfi)
**Yeni**: Tek mesaj, ortalanmış, sade metin

## Yapılan İşlemler (Sıralı)

1. ✅ **`dailyMessage` state tipini güncelle** → `{ message: string } | null`
2. ✅ **`generateLocalMessage` fonksiyonunu yeniden yaz** → 15 yeni şablon, tek alan çıktı
3. ✅ **`systemPrompt`'u değiştir** → Yeni "Günlük İlham Ajanı" talimatı
4. ✅ **`responseSchema`'yı güncelle** → Tek `message` alanı
5. ✅ **AI yanıt işleme kodunu güncelle** → `resData!.message`
6. ✅ **Console.log'u düzelt** → Eski alan referanslarını kaldır
7. ✅ **UI render'ı güncelle** → 4 bölüm → tek mesaj
8. ✅ **Plan dokümanını güncelle** → Bu dosya
9. ✅ **Havuz genişletme (v2)**:
   - `generateLocalMessage`: 15 sabit şablon → 4 tablodan kombinasyon (100 eylem × 100 hedef × 10 zaman × 200 gerekçe = 20.000.000 olası kombinasyon)
   - `systemPrompt`: AI prompt'una 4 tablo havuzu eklendi, AI da aynı tablolardan seçim yaparak üretir
   - Yasaklı kelimeler listesi genişletildi (Kant Filtresi)
   - Ton kuralı eklendi (arkadaşça, doğrudan, mistik olmayan)

## Notlar
- Local fallback (`generateLocalMessage`) AI başarısız olduğunda devreye girer
- Önceden oluşturulmuş mesaj (`preGeneratedMessage` localStorage) yeni formatla uyumlu
- Eski `unasTexts` ve `jungTexts` parametreleri `generateLocalMessage`'da hala parametre olarak duruyor ancak kullanılmıyor (imza değişikliği gereksiz yere büyük değişiklik olmasın diye)
- **Kombinasyon sayısı**: 100 eylem × 100 hedef × 10 zaman × 200 gerekçe = 20.000.000 olası kombinasyon. Seed'li seçim sayesinde aynı gün aynı kombinasyon tekrarlanmaz.
- **Deterministik**: Aynı seed her zaman aynı kombinasyonu üretir, böylece gün boyunca mesaj değişmez.
