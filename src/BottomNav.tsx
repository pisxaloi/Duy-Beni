import React, { useState } from "react";
import { MessageCircle, BookOpen, HelpCircle, Users, Pyramid, Volume2 } from "lucide-react";

interface BottomNavProps {
  onNavigate: (view: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onNavigate }) => {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("volume");
    return saved ? parseFloat(saved) : 0.5;
  });

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    localStorage.setItem("volume", val.toString());
  };

  // Navigasyon öncesi tüm sesleri kes
  const handleNavigate = (view: string) => {
    // speechSynthesis'i durdur
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // AudioContext'teki tüm sesleri durdur
    if (typeof window !== "undefined") {
      // window.currentLocalAudio varsa durdur
      const localAudio = (window as any).currentLocalAudio;
      if (localAudio) {
        try { localAudio.pause(); } catch (e) {}
        (window as any).currentLocalAudio = null;
      }
    }
    onNavigate(view);
  };

  return (
    <>
      {/* SES BAR - navigasyonun hemen üstünde */}
      <div className="fixed bottom-[65px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[380px] z-[9999]">
        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-900/30 to-amber-950/30 border border-amber-500/20 rounded-full px-4 py-2 backdrop-blur-md">
          <Volume2 size={16} className="text-amber-400/60 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] text-amber-500/60 font-mono uppercase tracking-wider flex-shrink-0">
              Ses
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="flex-1 h-1 appearance-none bg-amber-800/40 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400
                [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-500/30"
            />
            <span className="text-[11px] text-amber-400/80 font-mono font-bold w-10 text-right">
              %{Math.round(volume * 100)}
            </span>
          </div>
        </div>
      </div>

      {/* NAVIGASYON */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[412px] z-[9999] bg-black/90 backdrop-blur-md h-16 flex items-center justify-around">
        {/* 1. Mesaj (index) */}
        <button
          onClick={() => handleNavigate("index")}
          className="flex flex-col items-center gap-1 text-amber-400/60 hover:text-amber-300 transition-colors group"
          aria-label="Mesaj"
        >
          <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase tracking-wider">Mesaj</span>
        </button>

        {/* 2. Cümleler */}
        <button
          onClick={() => handleNavigate("sentence")}
          className="flex flex-col items-center gap-1 text-amber-400/60 hover:text-amber-300 transition-colors group"
          aria-label="Cümleler"
        >
          <BookOpen size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase tracking-wider">Cümleler</span>
        </button>

        {/* 3. Nasıl Yapıyoruz */}
        <button
          onClick={() => handleNavigate("nasil")}
          className="flex flex-col items-center gap-1 text-amber-400/60 hover:text-amber-300 transition-colors group"
          aria-label="Nasıl Yapıyoruz"
        >
          <HelpCircle size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase tracking-wider">Nasıl</span>
        </button>

        {/* 4. Klanım */}
        <button
          onClick={() => handleNavigate("klan")}
          className="flex flex-col items-center gap-1 text-amber-400/60 hover:text-amber-300 transition-colors group"
          aria-label="Klanım"
        >
          <Users size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase tracking-wider">Klanım</span>
        </button>

        {/* 5. Kadim Mısır */}
        <button
          onClick={() => handleNavigate("ancient")}
          className="flex flex-col items-center gap-1 text-amber-400/60 hover:text-amber-300 transition-colors group"
          aria-label="Kadim Mısır"
        >
          <Pyramid size={20} className="group-hover:scale-110 transition-transform" />
          <span className="text-[9px] uppercase tracking-wider">Kadim</span>
        </button>
      </div>
    </>
  );
};

export default BottomNav;
