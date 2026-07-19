'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { type SupportedLanguage, SUPPORTED_LANGUAGES, t as translate, detectBrowserLanguage } from '@/lib/i18n';
import { useAuthStore } from '@/store/authStore';

const STORAGE_KEY = 'medisathi_lang';

/** Read the persisted locale synchronously (SSR-safe). */
function readStoredLang(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
  const valid = SUPPORTED_LANGUAGES.map((l) => l.code);
  return stored && valid.includes(stored) ? stored : null;
}

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

  // Initialize from localStorage first to avoid flash-of-English on reload.
  const [lang, setLangState] = useState<SupportedLanguage>(
    () => readStoredLang() ?? detectBrowserLanguage()
  );

  // Sync from user.language when it changes AND differs from current state.
  useEffect(() => {
    const preferred = (user?.language as SupportedLanguage | undefined) ?? null;
    if (preferred && preferred !== lang) {
      setLangState(preferred);
      window.localStorage.setItem(STORAGE_KEY, preferred);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.language]);

  const setLang = useCallback((l: SupportedLanguage) => {
    setLangState(l);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
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
