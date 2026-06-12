import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, 'screenshots');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const BASE = 'http://localhost:3000';

// =============================================
// 1. ÖZELLİK GRAFİĞİ (1024x500)
// =============================================
console.log('1. Özellik Grafiği (1024x500)...');
const featurePage = await browser.newPage();
await featurePage.setViewport({ width: 1024, height: 500 });
await featurePage.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));
await featurePage.screenshot({ path: path.join(outputDir, 'ozellik-grafigi.png') });
console.log('  ✓ ozellik-grafigi.png');
await featurePage.close();

// =============================================
// 2. TELEFON EKRAN GÖRÜNTÜLERİ (412x860 -> 1080x1920)
// =============================================
console.log('\n2. Telefon ekran görüntüleri...');
const phonePage = await browser.newPage();
await phonePage.setViewport({ width: 412, height: 860 });

await phonePage.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

const rawDir = path.join(outputDir, 'raw');
if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir);

// Ana sayfa
await phonePage.screenshot({ path: path.join(rawDir, '01-anasayfa-mesaj.png') });
console.log('  ✓ 01-anasayfa-mesaj.png (raw)');

// Cümleler
const cumlelerBtn = await phonePage.$('button[aria-label="Cümleler"]');
if (cumlelerBtn) { await cumlelerBtn.click(); await new Promise(r => setTimeout(r, 4000)); }
await phonePage.screenshot({ path: path.join(rawDir, '02-cumleler.png') });
console.log('  ✓ 02-cumleler.png (raw)');

// Nasıl
const nasilBtn = await phonePage.$('button[aria-label="Nasıl Yapıyoruz"]');
if (nasilBtn) { await nasilBtn.click(); await new Promise(r => setTimeout(r, 4000)); }
await phonePage.screenshot({ path: path.join(rawDir, '03-nasil-yapiyoruz.png') });
console.log('  ✓ 03-nasil-yapiyoruz.png (raw)');

// Klanım
const klanBtn = await phonePage.$('button[aria-label="Klanım"]');
if (klanBtn) { await klanBtn.click(); await new Promise(r => setTimeout(r, 4000)); }
await phonePage.screenshot({ path: path.join(rawDir, '04-klanim.png') });
console.log('  ✓ 04-klanim.png (raw)');

// Kadim
const kadimBtn = await phonePage.$('button[aria-label="Kadim Mısır"]');
if (kadimBtn) { await kadimBtn.click(); await new Promise(r => setTimeout(r, 4000)); }
await phonePage.screenshot({ path: path.join(rawDir, '05-kadim-misir.png') });
console.log('  ✓ 05-kadim-misir.png (raw)');

await phonePage.close();

// Raw -> 1080x1920
console.log('\n  Telefon -> 1080x1920 ölçekleniyor...');
const phoneFiles = [
  '01-anasayfa-mesaj.png',
  '02-cumleler.png',
  '03-nasil-yapiyoruz.png',
  '04-klanim.png',
  '05-kadim-misir.png'
];
for (const file of phoneFiles) {
  await sharp(path.join(rawDir, file))
    .resize(1080, 1920, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toFile(path.join(outputDir, file));
  console.log(`  ✓ ${file} -> 1080x1920`);
}

// =============================================
// 3. 7 inç TABLET (1920x1080 landscape)
// =============================================
console.log('\n3. 7 inç Tablet (1920x1080)...');
const tablet7Page = await browser.newPage();
await tablet7Page.setViewport({ width: 1920, height: 1080 });
await tablet7Page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

// Ana sayfa - tablet landscape
await tablet7Page.screenshot({ path: path.join(outputDir, 'tablet7-anasayfa.png') });
console.log('  ✓ tablet7-anasayfa.png');

// Cümleler
const t7cumleler = await tablet7Page.$('button[aria-label="Cümleler"]');
if (t7cumleler) { await t7cumleler.click(); await new Promise(r => setTimeout(r, 4000)); }
await tablet7Page.screenshot({ path: path.join(outputDir, 'tablet7-cumleler.png') });
console.log('  ✓ tablet7-cumleler.png');

// Nasıl
const t7nasil = await tablet7Page.$('button[aria-label="Nasıl Yapıyoruz"]');
if (t7nasil) { await t7nasil.click(); await new Promise(r => setTimeout(r, 4000)); }
await tablet7Page.screenshot({ path: path.join(outputDir, 'tablet7-nasil.png') });
console.log('  ✓ tablet7-nasil.png');

// Klanım
const t7klan = await tablet7Page.$('button[aria-label="Klanım"]');
if (t7klan) { await t7klan.click(); await new Promise(r => setTimeout(r, 4000)); }
await tablet7Page.screenshot({ path: path.join(outputDir, 'tablet7-klanim.png') });
console.log('  ✓ tablet7-klanim.png');

// Kadim
const t7kadim = await tablet7Page.$('button[aria-label="Kadim Mısır"]');
if (t7kadim) { await t7kadim.click(); await new Promise(r => setTimeout(r, 4000)); }
await tablet7Page.screenshot({ path: path.join(outputDir, 'tablet7-kadim.png') });
console.log('  ✓ tablet7-kadim.png');

await tablet7Page.close();

// =============================================
// 4. 10 inç TABLET (1920x1200 landscape)
// =============================================
console.log('\n4. 10 inç Tablet (1920x1200)...');
const tablet10Page = await browser.newPage();
await tablet10Page.setViewport({ width: 1920, height: 1200 });
await tablet10Page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

// Ana sayfa
await tablet10Page.screenshot({ path: path.join(outputDir, 'tablet10-anasayfa.png') });
console.log('  ✓ tablet10-anasayfa.png');

// Cümleler
const t10cumleler = await tablet10Page.$('button[aria-label="Cümleler"]');
if (t10cumleler) { await t10cumleler.click(); await new Promise(r => setTimeout(r, 4000)); }
await tablet10Page.screenshot({ path: path.join(outputDir, 'tablet10-cumleler.png') });
console.log('  ✓ tablet10-cumleler.png');

// Nasıl
const t10nasil = await tablet10Page.$('button[aria-label="Nasıl Yapıyoruz"]');
if (t10nasil) { await t10nasil.click(); await new Promise(r => setTimeout(r, 4000)); }
await tablet10Page.screenshot({ path: path.join(outputDir, 'tablet10-nasil.png') });
console.log('  ✓ tablet10-nasil.png');

// Klanım
const t10klan = await tablet10Page.$('button[aria-label="Klanım"]');
if (t10klan) { await t10klan.click(); await new Promise(r => setTimeout(r, 4000)); }
await tablet10Page.screenshot({ path: path.join(outputDir, 'tablet10-klanim.png') });
console.log('  ✓ tablet10-klanim.png');

// Kadim
const t10kadim = await tablet10Page.$('button[aria-label="Kadim Mısır"]');
if (t10kadim) { await t10kadim.click(); await new Promise(r => setTimeout(r, 4000)); }
await tablet10Page.screenshot({ path: path.join(outputDir, 'tablet10-kadim.png') });
console.log('  ✓ tablet10-kadim.png');

await tablet10Page.close();

await browser.close();

console.log('\n========================================');
console.log('TÜM DOSYALAR HAZIR!');
console.log('========================================');
console.log('\n📱 Telefon (1080x1920):');
console.log('  01-anasayfa-mesaj.png');
console.log('  02-cumleler.png');
console.log('  03-nasil-yapiyoruz.png');
console.log('  04-klanim.png');
console.log('  05-kadim-misir.png');
console.log('\n📟 7" Tablet (1920x1080):');
console.log('  tablet7-anasayfa.png');
console.log('  tablet7-cumleler.png');
console.log('  tablet7-nasil.png');
console.log('  tablet7-klanim.png');
console.log('  tablet7-kadim.png');
console.log('\n📟 10" Tablet (1920x1200):');
console.log('  tablet10-anasayfa.png');
console.log('  tablet10-cumleler.png');
console.log('  tablet10-nasil.png');
console.log('  tablet10-klanim.png');
console.log('  tablet10-kadim.png');
console.log('\n🖼 Özellik Grafiği (1024x500):');
console.log('  ozellik-grafigi.png');
console.log('\n📱 Uygulama Simgesi (512x512):');
console.log('  public/logo-512.png (hazır)');
console.log(`\nKlasör: ${outputDir}`);
