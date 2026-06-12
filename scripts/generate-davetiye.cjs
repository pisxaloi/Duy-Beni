const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // HTML dosyasının tam yolu
  const htmlPath = path.resolve(__dirname, '..', 'public', 'klan-davetiye.html');
  
  await page.goto(`file://${htmlPath}`, {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  // Fontların yüklenmesi için bekle
  await new Promise(r => setTimeout(r, 2000));
  
  // Kart elementini seç
  const card = await page.$('#card');
  
  if (!card) {
    console.error('Kart elementi bulunamadı!');
    await browser.close();
    process.exit(1);
  }
  
  // PNG olarak kaydet
  const outputPath = path.resolve(__dirname, '..', 'public', 'klan0.png');
  await card.screenshot({
    path: outputPath,
    type: 'png',
    omitBackground: false
  });
  
  console.log(`Davetiye görseli oluşturuldu: ${outputPath}`);
  
  await browser.close();
})();
