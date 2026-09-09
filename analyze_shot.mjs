// Ekran görüntüsünü kompakt karakter haritasına çevirir (tanılama)
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = process.argv.slice(2);
for (const f of files) {
  const p = path.join(__dirname, f);
  const img = sharp(p);
  const meta = await img.metadata();
  const COLS = 52;
  const ROWS = 24;
  const cellW = Math.max(1, Math.round(meta.width / COLS));
  const cellH = Math.max(1, Math.round(meta.height / ROWS));
  const { data, info } = await img
    .resize(COLS, ROWS, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  console.log(`\n=== ${f} (${meta.width}x${meta.height}) cell=${cellW}x${cellH} ===`);
  const chars = " .:-=+*#%@";
  for (let y = 0; y < ROWS; y++) {
    let line = "";
    for (let x = 0; x < COLS; x++) {
      const i = (y * COLS + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      line += chars[Math.min(9, Math.floor((lum / 256) * 10))];
    }
    console.log(line);
  }
}
