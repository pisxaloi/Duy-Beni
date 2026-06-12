# MESAJLAR NASIL ÜRETİLİYOR - KOD ANALİZİ (GÜNCEL)

## ÖNEMLİ UYARI

**`MESAJ_CUMLELERI` dizisi (satır 729-771) ESKİ sistemi anlatıyor.** Gerçek mesaj üretimi `generateLocalMessage` fonksiyonu (satır 300-614) ile yapılıyor ve bu ikisi **tamamen farklı**. Aşağıdaki analiz **gerçek koda** dayanmaktadır.

---

## 1. GENEL MİMARİ

Uygulama günlük mesajları **AI (Gemini/DeepSeek) kullanmadan**, tamamen **lokal (istemci taraflı) bir algoritma** ile üretiyor.

## 2. MESAJ ÜRETİM AKIŞI (GERÇEK KOD)

### Adım 1: Tetikleyici
- Kullanıcı index sayfasına girdiğinde (`currentView === "index"`)
- `dayPhase === "init"` ise `getDailyMessage(refreshSalt)` çağrılır
- `refreshSalt`, kullanıcının cümle seçimleri değişince artar

### Adım 2: Önceden Üretilmiş Mesaj Kontrolü
- `localStorage`'da `preGeneratedMessage` anahtarı kontrol edilir
- Bugünün tarihiyle eşleşen string formatında mesaj varsa direkt kullanılır

### Adım 3: Seed Hesaplama
- `getDeterministicSelection()` ile kullanıcının seçtiği cümlelerden seed üretilir
- Seed'e `salt * 7919` (asal sayı) eklenir

### Adım 4: Tekrar Önleme
- `localStorage`'daki `messageHistory`'den son 7 günün kombinasyonları okunur

### Adım 5: Lokal Mesaj Üretimi (`generateLocalMessage`)
**10 kategoriden** seed'li rastgele bir eylem seçilir:

| # | Kategori | Eylemler |
|---|----------|----------|
| 1 | İLETİŞİM / SOSYAL | mesaj at, ara, teşekkür et, özür dile, söyle, sor, gönder, paylaş, kucakla, dinle |
| 2 | İÇSEL / ZİHİNSEL | düşün, hatırla, unut, affet, karar ver, kabul et, reddet, seç, bekle, vazgeç, dene, sorgula |
| 3 | FİZİKSEL / BEDENSEL | yürü, nefes al, otur, kalk, gülümse, dur, bak, dinle, yaz, sil, esne, koş, dans et |
| 4 | DÖNÜŞÜM / DEĞİŞİM | değiştir, başla, devam et, bırak, dönüş, yenilen, büyü, dönüştür |
| 5 | BAKIM / TEMİZLİK / DÜZEN | temizle, düzenle, kontrol et, yıka, onar, bakım yap, sula |
| 6 | DURGUNLUK / KABULLENİŞ | sus, bekle, dinlen, bırak, sakinleş, gözlemle |
| 7 | MANEVİ / RUHSAL | şükret, niyet et, bağlan, dinle, bırak, fark et |
| 8 | YARATICILIK / ÜRETİM | üret, çiz, icat et, dene, yaz, tasarla |
| 9 | DOĞA / ÇEVRE | çık dışarı, gözlemle, ek, temizle, dinle, dokun |
| 10 | İLİŞKİLER / BAĞLAR | bağ kur, sarıl, teşekkür et, yardım et, affet, dinle |

### Adım 6: Filtreleme (Kant Filtresi - Pratik)
Kodda "Kant" sadece **isim olarak** geçiyor, felsefi bir filtre DEĞİL:
- **Fiziksel eylem + lokasyon hedefi** reddedilir (örn: "koş bir parkta" → herkes koşamaz/herkes parka gidemez)
- **Kısa eylem + uzun süre ifadesi** reddedilir (örn: "esne birkaç dakika")
- **Son 7 günde kullanılmış kombinasyon** reddedilir
- 50 denemede uygun bulunamazsa fallback

### Adım 7: Türkçe Cümle Yapısı (SOV)
- "Bugün dinle bir hikayeyi" → "Bugün bir hikaye dinle"
- "ve" ile başlayan hedefler istisna (örn: "kalk ve bir şey yap")

### Adım 8: Cümle Kalıpları (20 adet)
Örnekler:
- `Bugün {nesne} {fiil}. Çünkü {gerekçe}.`
- `Bir an dur ve {nesne} {fiil}. {gerekçe}.`
- `Şimdi {nesne} {fiil}. {gerekçe}.`
- `Kendine bir iyilik yap: {nesne} {fiil}. {gerekçe}.`
- `Farkında mısın? {nesne} {fiil}. {gerekçe}.`
- `Unutma: {nesne} {fiil}. {gerekçe}.`
- `Haydi {nesne} {fiil}. {gerekçe}.`

### Adım 9: Güvenlik Kontrolü
- Mesaj 250 karakterden uzunsa veya "undefined" içeriyorsa fallback

### Adım 10: Gelecek Günün Mesajını Önceden Üretme
- Yarının mesajı hesaplanıp localStorage'a kaydedilir

## 3. ESKİ SİSTEM vs YENİ SİSTEM KARŞILAŞTIRMASI

| Özellik | ESKİ (MESAJ_CUMLELERI metni) | YENİ (generateLocalMessage) |
|---------|------------------------------|------------------------------|
| AI Kullanımı | Gemini/DeepSeek | YOK, tamamen lokal |
| Jung | Gölge psikolojisi, bastırılan korku | KULLANILMIYOR |
| Unas 283 Cümle | Piramit metinlerinden ritim | KULLANILMIYOR |
| Sokrates | Sokratik kesme, cümle yarım bırakma | KULLANILMIYOR |
| Konfüçyüs | Sokaktan bilgelik, tebeşir | KULLANILMIYOR |
| Kant (felsefi) | "Aklını kullan" öğüdü | SADECE pratik filtre (fiziksel+ lokasyon) |
| Mesaj Yapısı | 5 bölümlü (Eylem, İşleyiş, İşaret, Gölge Yazıt, Gölge Keşfi) | Tek cümle (eylem + hedef + gerekçe) |
| Bitiş | "Ve sen o anı..." (yarım) | Normal bitiş (tam cümle) |
| Kategori | - | 10 kategori, 70+ eylem |

## 4. "MESAJLAR NASIL ÜRETİLİYOR" BÖLÜMÜ

Bu bölüm (`view === "mesaj"`) şu anda `MESAJ_CUMLELERI` dizisindeki **ESKİ sistemi anlatan** 41 cümleyi gösteriyor. Gerçek sistemle uyuşmuyor. Güncellenmesi gerekiyor.
