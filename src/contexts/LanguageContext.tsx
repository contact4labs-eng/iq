import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { translations } from "@/i18n/translations";
import type { TranslationKey } from "@/i18n/translations";

export type Language = "el" | "en";
export type { TranslationKey };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("invoiceiq-lang");
    return (stored === "el" || stored === "en") ? stored : "el";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("invoiceiq-lang", lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.el;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
