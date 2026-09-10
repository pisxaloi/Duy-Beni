import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { bannerGoster, bannerKaldir, reklamBaslat } from "../services/adsService";

// Sabit boyutlu (320×50) AdMob banner alanı.
// - Yalnızca native platformda gösterilir; web/dev tarayıcıda hiçbir şey render edilmez.
// - Native view DOM'a girmediği için, banner'ın kapladığı 50px'lik şeffaf rezerv
//   burada bırakılır; böylece mesaj/metin banner'ın altında kalmaz.
export const BANNER_YUKSEKLIK = 50;

export default function BannerAd() {
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!native) return;
    reklamBaslat();
    bannerGoster();
    return () => {
      bannerKaldir();
    };
  }, [native]);

  if (!native) return null;

  return (
    <div
      style={{ width: "100%", height: `${BANNER_YUKSEKLIK}px`, flexShrink: 0 }}
      aria-hidden="true"
    />
  );
}
