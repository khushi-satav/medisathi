'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { type SupportedLanguage, t as translate, detectBrowserLanguage } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';

interface LanguageContextValue {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [lang, setLangState] = useState<SupportedLanguage>('en');

  // Sync from user.language (set during login / onboarding) or fall back to browser
  useEffect(() => {
    const preferred = (user?.language as SupportedLanguage) || detectBrowserLanguage();
    setLangState(preferred);
  }, [user?.language]);

  const setLang = useCallback((l: SupportedLanguage) => {
    setLangState(l);
  }, []);

  const tFn = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: tFn }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
