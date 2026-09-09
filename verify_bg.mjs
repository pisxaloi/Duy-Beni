// =============================================================
// Mesaj ekranı arka plan kanıtı (CDP + piksel örnekleme)
// Kullanım: node verify_bg.mjs
// - public/duybeni-arkaplan.jpg öğesinin gerçekten ekranda render
//   edildiğini kanıtlar:
//   1) tarayıcıdan arka plan CSS'ini okur
//   2) ekran görüntüsü alır
//   3) görüntüyü "cover" mantığıyla referans alıp aynı pikselleri
//      karşılaştırır (siyah karartma %55 => beklenen = img * 0.45)
// =============================================================
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const BASE = "http://localhost:3000";
const SCRIM = 0.45; // bg-black/55 => img * (1 - 0.55)

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"],
});

const viewports = [
  { name: "telefon-412x860", width: 412, height: 860 },
  { name: "masaustu-1280x800", width: 1280, height: 800 },
];

const results = [];

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });

  // Ana sayfa (Mesaj) yüklenir
  await page.goto(BASE + "/", { waitUntil: "networkidle0", timeout: 40000 });

  // Arka plana sahip kök öğeyi bekle (HMR sonrası kod canlıda)
  const bgInfo = await page.waitForFunction(
    () => {
      const all = Array.from(document.querySelectorAll("*"));
      const el = all.find(
        (n) =>
          n instanceof HTMLElement &&
          getComputedStyle(n).backgroundImage.includes("duybeni-arkaplan")
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundImage,
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        vw: window.innerWidth,
        vh: window.innerHeight,
      };
    },
    { timeout: 40000, polling: 300 }
  ).then((h) => h.jsonValue());

  // İçerik + animasyon oturana kadar bekle
  await new Promise((r) => setTimeout(r, 2500));

  const shotPath = path.join(outDir, `kanit-mesaj-bg-${vp.name}.png`);
  await page.screenshot({ path: shotPath });
  console.log(`[${vp.name}] ekran görüntüsü: ${shotPath}`);

  // Görünür metin var mı (mesaj ekranı içerikle birlikte render edildi mi)?
  const bodyText = await page.evaluate(() =>
    (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120)
  );
  console.log(`[${vp.name}] ekrandaki metin (ilk 120): ${JSON.stringify(bodyText)}`);

  // ----- Referans: aynı görseli "cover + center" ile öğe boyutuna ölçekle -----
  const ref = await sharp(path.join(__dirname, "public", "duybeni-arkaplan.jpg"))
    .resize(Math.round(bgInfo.rect.w), Math.round(bgInfo.rect.h), {
      fit: "cover",
      position: "centre",
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const refRaw = ref.data;
  const refW = ref.info.width;
  const refH = ref.info.height;

  // ----- Ekran görüntüsünü ham piksellere çevir -----
  const shot = await sharp(shotPath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const shotRaw = shot.data;
  const shotW = shot.info.width;
  const shotH = shot.info.height;

  const px = (buf, w, x, y) => {
    const i = (y * w + x) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  };

  // Arka plan kökünün ekranın TAMAMINI kaplayıp kaplamadığı
  const tamKapliyor =
    Math.abs(bgInfo.rect.x) < 2 &&
    Math.abs(bgInfo.rect.y) < 2 &&
    Math.abs(bgInfo.rect.w - bgInfo.vw) < 2 &&
    Math.abs(bgInfo.rect.h - bgInfo.vh) < 2;
  console.log(
    `[${vp.name}] bg rect=${JSON.stringify(bgInfo.rect)} viewport=${bgInfo.vw}x${bgInfo.vh} tamEkranKapsama=${tamKapliyor}`
  );
  console.log(`[${vp.name}] computed backgroundImage=${bgInfo.bg}`);


  // ----- 1) Metinden uzak örnek noktalar: ekran vs beklenen (img*0.45) -----
  const points = [];
  for (const fx of [0.5, 0.1, 0.9]) {
    for (const fy of [0.06, 0.2, 0.35, 0.5]) {
      points.push({ fx, fy });
    }
  }

  let eslesen = 0;
  console.log(`[${vp.name}] nokta bazında karşılaştırma (beklenen = görsel * 0.45):`);
  for (const p of points) {
    const sx = Math.round(p.fx * bgInfo.rect.w);
    const sy = Math.round(p.fy * bgInfo.rect.h);
    const got = px(shotRaw, shotW, Math.round(bgInfo.rect.x + sx), Math.round(bgInfo.rect.y + sy));
    const expRaw = px(refRaw, refW, sx, sy);
    const exp = expRaw.map((c) => Math.round(c * SCRIM));
    const diff = Math.max(Math.abs(got[0] - exp[0]), Math.abs(got[1] - exp[1]), Math.abs(got[2] - exp[2]));
    if (diff <= 28) eslesen++;
    console.log(
      `   (%3d,%3d) gerçek=%d,%d,%d  beklenen=%d,%d,%d  fark(max)=%d %s`,
      sx, sy, got[0], got[1], got[2], exp[0], exp[1], exp[2], diff,
      diff <= 28 ? "✔" : "✖"
    );
  }

  // ----- 2) Renk çeşitliliği: boş/siyah ekran olsaydı ~1 benzersiz renk olurdu -----
  const colors = new Set();
  let toplam = 0;
  let ort = [0, 0, 0];
  // Sadece bg kökünün üst %85'i (alt navigasyon çubuğunu hariç tut)
  const maxY = Math.min(shotH, Math.round(bgInfo.rect.y + bgInfo.rect.h * 0.85));
  for (let y = Math.round(bgInfo.rect.y); y < maxY; y += 2) {
    for (let x = Math.round(bgInfo.rect.x); x < Math.round(bgInfo.rect.x + bgInfo.rect.w); x += 2) {
      const i = (y * shotW + x) * 4;
      colors.add(`${shotRaw[i]},${shotRaw[i + 1]},${shotRaw[i + 2]}`);
      ort[0] += shotRaw[i];
      ort[1] += shotRaw[i + 1];
      ort[2] += shotRaw[i + 2];
      toplam++;
    }
  }
  ort = ort.map((v) => Math.round(v / toplam));
  console.log(
    `[${vp.name}] örneklenen piksel=${toplam} benzersizRenk=${colors.size} ortalamaRGB=${ort.join(",")}`
  );

  results.push({ name: vp.name, tamKapliyor, eslesen, toplamNokta: points.length, renkCesidi: colors.size, ortalama: ort });
  await page.close();
}

await browser.close();

console.log("\n===== ÖZET =====");
for (const r of results) {
  console.log(
    `${r.name}: tamEkranKapsama=${r.tamKapliyor}  pikselEslesme=${r.eslesen}/${r.toplamNokta}  benzersizRenk=${r.renkCesidi}  ortalamaRGB=${r.ortalama.join(",")}`
  );
}
console.log("Kanıt görüntüleri: screenshots/kanit-mesaj-bg-*.png");

