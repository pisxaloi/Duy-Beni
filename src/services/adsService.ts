// ============================================================
// adsService – AdMob banner servisi (Duy Beni)
// ------------------------------------------------------------
// ✅ GERÇEK AdMob kimlikleri aktif (Android).
//    iOS tarafı henüz TEST ID kullanıyor (ayrı App Store uygulaması gerektirir).
// ============================================================

import { AdMob, BannerAdPosition } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";

const BANNER_BIRIM_ID = "ca-app-pub-9770563091504189/3613536784"; // Duy Beni – gerçek Android banner birimi

let baslatildi = false;

/** AdMob SDK'sını (native platformda) yalnızca bir kez başlatır. */
export function reklamBaslat() {
  if (baslatildi) return;
  if (!Capacitor.isNativePlatform()) return;
  baslatildi = true;
  AdMob.initialize().catch((e) => console.warn("[adsService] AdMob başlatılamadı:", e));
}

/** Alt-ortada sabit banner gösterir (native değilse hiçbir şey yapmaz). */
export async function bannerGoster(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    reklamBaslat();
    await AdMob.showBanner({
      adId: BANNER_BIRIM_ID,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: false, // test birim ID'si kullanıldığı için Google test reklamı gösterir
    });
  } catch (e: any) {
    console.warn("[adsService] Banner gösterilemedi:", e?.message ?? e);
  }
}

/** Gösterilen banner'ı gizler (modal vb. durumlarda). */
export async function bannerGizle(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.hideBanner();
  } catch (e: any) {
    console.warn("[adsService] Banner gizlenemedi:", e?.message ?? e);
  }
}

/** Banner'ı tamamen kaldırır (unmount). */
export async function bannerKaldir(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.removeBanner();
  } catch {}
}
