import React, { useEffect } from "react";
import "./index.css";
import Index from "./Index";

const App: React.FC = () => {

  // ============================================================
  // SABAH BÄ°LDÄ°RÄ°MÄ° ZAMANLAYICI (GÃ¼nde 1 kere â€“ saat 07:00)
  // ============================================================
  useEffect(() => {
    const setupLocalNotifications = async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        // Ä°zin durumunu kontrol et
        const permResult = await LocalNotifications.checkPermissions();
        if (permResult.display === 'prompt') {
          const reqResult = await LocalNotifications.requestPermissions();
          if (reqResult.display !== 'granted') {
            console.warn('Local notification permission not granted');
            return;
          }
        } else if (permResult.display === 'denied') {
          console.warn('Local notification permission denied');
          return;
        }

        // Ã–nce varsa eski zamanlayÄ±cÄ±larÄ± temizle
        await LocalNotifications.cancel({
          notifications: [
            { id: 905 }, { id: 1005 }, { id: 1105 },
            { id: 705 }, { id: 805 },
            { id: 2145 }, { id: 2200 }, { id: 2215 },
            { id: 2245 }, { id: 2300 }, { id: 2315 },
            { id: 2320 }, { id: 2335 }, { id: 2350 },
            { id: 2338 }, { id: 2343 }, { id: 2348 }
          ]
        });

        // GÃ¼nde 1 kere â€“ saat 07:00'de bildirim
        await LocalNotifications.schedule({
          notifications: [{
            id: 700,
            title: "Nefertiti",
            body: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
            largeBody: "Kadim mesaj seni bekliyor. Dinlemek ister misin?",
            summaryText: "Duy Beni",
            schedule: {
              on: { hour: 7, minute: 0 },
              allowWhileIdle: true
            },
            sound: "beep.wav",
            attachments: undefined,
            actionTypeId: "",
            channelId: "duybeni_channel",
            extra: { url: "/?autoPlay=true" }
          }]
        });

        console.log('âœ… Local notification scheduled for 07:00 (1 notification per day)');
      } catch (err) {
        console.warn('LocalNotifications setup failed:', err);
      }
    };

    setupLocalNotifications();
  }, []);

  return (
    <div className="app relative h-full w-full">
      {/* INDEX SAYFASI */}
      <Index />
    </div>
  );
};

export default App;

