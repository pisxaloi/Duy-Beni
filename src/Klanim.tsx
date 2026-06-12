import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

interface Friend {
  id: string;
  name: string;
  phone: string;
  status?: string;
  invitedAt?: number;
}

interface MisirKlanProps {
  user?: any;
  localName?: string;
  isPlaying: boolean;
  volume: number;
  onStopAudio: () => void;
  onViewChange: (view: string) => void;
}

export default function MisirKlan({
  user,
  localName,
  isPlaying,
  volume,
  onStopAudio,
  onViewChange,
}: MisirKlanProps) {
  const [klanList, setKlanList] = useState<Friend[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [pendingInviteName, setPendingInviteName] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Ses otomatik başlatma
  useEffect(() => {
    if (audioRef.current) return; // zaten başlatıldı

    const audio = new Audio("/klan.mp3");
    audio.loop = false;
    audio.volume = 0.5;
    audioRef.current = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Otomatik oynatma engellendiyse, kullanıcı etkileşiminde başlat
        const handleInteraction = () => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("touchstart", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        document.addEventListener("touchstart", handleInteraction);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const getInviteBaseUrl = () =>
    typeof window !== "undefined"
      ? window.location.origin
      : "https://sentaktik-motor-backend-run.app";

  const openWhatsAppKlanInvite = (
    name: string,
    phone: string,
    friendId: string,
    displayName: string,
    uid: string,
  ) => {
    const inviteLink = `${getInviteBaseUrl()}?inviter=${uid}&inviteId=${friendId}&isim=${encodeURIComponent(displayName)}`;
    const message = `Kraliçe Nefertiti'den her gün bir mesaj geliyor ama öyle sıradan sözler değil. Okudukça çok etkileniyorum. İçime işliyor. Düşündürüyor. O kadar güçlü ki, artık her gün bakıyorum. Her gün farklı bir şey. Bazen düşündürüyor, bazen harekete geçiriyor, bazen durdurup nefes aldırıyor. Hiç sıkmıyor, tam tersine iyi geliyor. Sen de dene ve bakalım aynı etkiyi hissedecek misin?\n\n${inviteLink}`;

    let phoneParam = "";
    if (phone) {
      const justNum = phone.replace(/\D/g, "");
      if (justNum.length > 5) {
        phoneParam = `phone=${justNum}&`;
      }
    }
    const waUrl = phoneParam
      ? `https://web.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    setTimeout(() => {
      window.open(waUrl, "_blank");
    }, 600);
  };

  const handleSendKankInvite = useCallback(async () => {
    const uid = user?.uid || "anon_" + Date.now();
    const displayName = user?.displayName || localName || "İsimsiz";

    const createInviteId = (index = 0) =>
      `klan_${Date.now()}_${index}_${Math.random().toString(36).slice(2)}`;

    // Rehber API'sini dene
    if ("contacts" in navigator && "select" in (navigator as any).contacts) {
      try {
        const props = ["name", "tel"];
        const opts = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, opts);

        if (contacts && contacts.length > 0) {
          const newEntries: Friend[] = contacts.map(
            (contact: any, index: number) => {
              const name = contact.name?.[0] || "İsimsiz";
              const phone = contact.tel?.[0] || "";
              return {
                id: createInviteId(index),
                name,
                phone,
                status: "pending",
                invitedAt: Date.now(),
              };
            },
          );

          setKlanList((prev) => [...prev, ...newEntries]);

          await new Promise((resolve) => setTimeout(resolve, 500));

          setTimeout(() => {
            newEntries.forEach((entry) => {
              openWhatsAppKlanInvite(
                entry.name,
                entry.phone,
                entry.id,
                displayName,
                uid,
              );
            });
          }, 600);
          return;
        }
      } catch (err) {
        console.warn("Rehber seçimi iptal edildi:", err);
      }
    }

    // Rehber kullanılamadı — WhatsApp'ı aç, sonra isim girişi göster
    const inviteLink = `${getInviteBaseUrl()}?inviter=${uid}&inviteId=${createInviteId()}&isim=${encodeURIComponent(displayName)}`;
    const message = `Kraliçe Nefertiti'den her gün bir mesaj geliyor ama öyle sıradan sözler değil. Okudukça çok etkileniyorum. İçime işliyor. Düşündürüyor. O kadar güçlü ki, artık her gün bakıyorum. Her gün farklı bir şey. Bazen düşündürüyor, bazen harekete geçiriyor, bazen durdurup nefes aldırıyor. Hiç sıkmıyor, tam tersine iyi geliyor. Sen de dene ve bakalım aynı etkiyi hissedecek misin?\n\n${inviteLink}`;
    const waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    setTimeout(() => {
      window.open(waUrl, "_blank");
    }, 600);
    // WhatsApp açıldıktan sonra isim girişini göster
    setTimeout(() => {
      setShowNameInput(true);
      setPendingInviteName("");
    }, 800);
  }, [user, localName]);

  const handleNameSubmit = useCallback(() => {
    const name = pendingInviteName.trim() || "İsimsiz";
    const uid = user?.uid || "anon_" + Date.now();
    const displayName = user?.displayName || localName || "İsimsiz";

    const newEntry: Friend = {
      id: `klan_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      phone: "",
      status: "pending",
      invitedAt: Date.now(),
    };
    setKlanList((prev) => [...prev, newEntry]);
    setShowNameInput(false);
    setPendingInviteName("");
  }, [pendingInviteName, user, localName]);

  const removeKlanMember = (id: string) => {
    setKlanList((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <motion.div
      key="klan"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col w-full min-h-screen items-center justify-start pt-4 sm:pt-6 text-center bg-black overflow-y-auto scrollbar-hide"
    >
      {/* Arka plan resmi */}
      <div className="absolute inset-0 z-0">
        <img
          src="/klanbac.jpg"
          alt="Klan Arka Plan"
          className="w-full h-full object-cover"
        />
      </div>

      {/* İçerik */}
      <div className="relative z-10 w-full flex flex-col items-center px-4 pb-[200px]">
        <h2 className="text-white text-[12px] sm:text-[14px] font-extralight tracking-[0.8em] mb-3 shrink-0 uppercase ml-[0.8em]">
          KLAN
        </h2>

        {/* Klan listesi */}
        <div className="flex-1 w-full max-w-sm px-4 min-h-0 flex flex-col z-20 mt-2">
          <p className="text-white/50 text-[10px] tracking-widest uppercase mb-2 shrink-0 text-left w-full">
            Klan listesi ({klanList.length})
          </p>
          <div className="flex-1 min-h-0 overflow-y-auto rounded-md border border-white/10 bg-black/40 backdrop-blur-sm scrollbar-hide">
            {klanList.length === 0 ? (
              <p className="text-white/40 text-[11px] py-6 px-3 text-center leading-relaxed">
                Rehberden kişi seçip davet gönderince burada görünür.
              </p>
            ) : (
              <ul className="divide-y divide-white/10">
                {klanList.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                  >
                    <span className="text-white text-[13px] font-light truncate flex-1">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeKlanMember(f.id)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border border-red-500/40 bg-red-950/40 text-red-400 text-[10px] hover:bg-red-900/50 transition-all"
                      title="Listeden çıkar"
                    >
                      <X size={12} />
                      Çıkar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp davet — ses barının hemen üstü, fixed */}
      <div className="fixed bottom-[130px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[380px] z-[9998]">
        <div className="w-full relative overflow-hidden rounded-md border border-yellow-500/30 bg-black/70 backdrop-blur-md p-3 flex flex-col items-center text-center shadow-[0_0_25px_rgba(234,179,8,0.15)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/60 to-transparent opacity-60" />

          <p className="text-white/90 font-light text-[11px] sm:text-[12px] leading-relaxed relative z-10 px-2">
            <span className="text-yellow-500 font-semibold">Arkadaşlarını davet et,</span> klanını kur.
          </p>
          <p className="text-white/80 font-light text-[10px] sm:text-[11px] leading-relaxed relative z-10 px-2 mt-1">
            Butona basınca rehber açılır; seçtiğin kişiler listeye eklenir ve WhatsApp daveti hazırlanır.
          </p>
          <p className="text-white/60 font-light text-[9px] sm:text-[10px] leading-relaxed relative z-10 px-2 mt-1">
            Listeden istediğin kişiyi Çıkar ile silebilirsin. Süre sınırı yok.
          </p>
          <div className="mt-2 pt-2 border-t border-yellow-500/20 w-full">
            <button
              onClick={handleSendKankInvite}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-green-600/80 hover:bg-green-600 text-white text-[10px] font-medium tracking-wide transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] w-full justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Rehberden Seç ve Davet Gönder
            </button>
          </div>
        </div>
      </div>

      {/* İsim giriş modalı */}
      {showNameInput && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
          <div className="w-full max-w-sm bg-gradient-to-b from-amber-950 to-black border border-amber-500/30 rounded-xl p-6 shadow-2xl shadow-amber-900/40">
            <p className="text-white/90 text-[13px] font-light text-center mb-4">
              WhatsApp'ta kime davet gönderdin?
            </p>
            <input
              type="text"
              value={pendingInviteName}
              onChange={(e) => setPendingInviteName(e.target.value)}
              placeholder="Kişinin adı..."
              className="w-full px-4 py-3 rounded-lg bg-black/60 border border-amber-500/30 text-white text-[14px] placeholder:text-white/30 outline-none focus:border-amber-400/60 transition-all mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNameSubmit();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNameInput(false);
                  setPendingInviteName("");
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/20 text-white/60 text-[12px] hover:bg-white/5 transition-all"
              >
                Vazgeç
              </button>
              <button
                onClick={handleNameSubmit}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-yellow-600/80 to-yellow-700/80 text-white text-[12px] font-medium hover:from-yellow-500/80 hover:to-yellow-600/80 transition-all"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
