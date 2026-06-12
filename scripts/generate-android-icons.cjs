const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SOURCE = path.resolve(__dirname, "../public/logo-duy-beni.jpg");
const RES_DIR = path.resolve(__dirname, "../android/app/src/main/res");

// Android mipmap boyutları
const SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error("Kaynak dosya bulunamadı:", SOURCE);
    process.exit(1);
  }

  for (const [dir, size] of Object.entries(SIZES)) {
    const outDir = path.join(RES_DIR, dir);
    if (!fs.existsSync(outDir)) {
      console.warn("Dizin bulunamadı, atlanıyor:", outDir);
      continue;
    }

    // ic_launcher.png
    await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(outDir, "ic_launcher.png"));

    // ic_launcher_round.png
    await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(outDir, "ic_launcher_round.png"));

    // ic_launcher_foreground.png
    await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(path.join(outDir, "ic_launcher_foreground.png"));

    console.log(`✓ ${dir} (${size}x${size})`);
  }

  console.log("\nTüm Android ikonları güncellendi.");
}

main().catch(console.error);
