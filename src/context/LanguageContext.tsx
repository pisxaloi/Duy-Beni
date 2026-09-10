import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// ============================================================
// Duy Beni – dil yönetimi (Syncra/MAAT deseniyle aynı)
// ------------------------------------------------------------
// Desteklenen diller burada tanımlıdır. Yeni bir dil eklemek için listeye
// kodu eklemek ve src/data altına o dilin veri dosyalarını koymak yeterlidir
// (örn. jung.en.ts -> jungData_EN). Şu an: Türkçe (tr), İngilizce (en), Almanca (de), İspanyolca (es), Portekizce (pt).
// ============================================================
export const SUPPORTED_LANGUAGES = ["tr", "en", "de", "es", "pt"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "duybeni_language";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "tr",
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("tr");

  // localStorage'dan oku (ilk yükleme)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
        setLanguageState(stored);
      }
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
