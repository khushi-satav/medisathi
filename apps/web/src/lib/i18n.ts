import { translations } from './translations';

export type SupportedLanguage = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'bn';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English',   nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi',     nativeLabel: 'हिंदी' },
  { code: 'mr', label: 'Marathi',   nativeLabel: 'मराठी' },
  { code: 'ta', label: 'Tamil',     nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu',    nativeLabel: 'తెలుగు' },
  { code: 'bn', label: 'Bengali',   nativeLabel: 'বাংলা' },
];

type TranslationsType = typeof translations;
type LangDict = TranslationsType['en'];

/** Resolve a dot-notated key e.g. "dashboard.greeting" from a language dict */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Get a translation string.
 * Falls back to English if the key is missing in the target language.
 * Interpolates {name}, {step}, {total} style placeholders.
 */
export function t(
  lang: SupportedLanguage,
  key: string,
  vars?: Record<string, string | number>
): string {
  const dict = (translations as Record<string, LangDict>)[lang] ?? translations.en;
  const fallback = translations.en;

  let raw = resolvePath(dict as unknown as Record<string, unknown>, key)
          ?? resolvePath(fallback as unknown as Record<string, unknown>, key);

  if (typeof raw !== 'string') return key; // last-resort fallback

  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      raw = (raw as string).replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }

  return raw as string;
}

/** Detect browser language and map to a supported language code */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language.toLowerCase().split('-')[0];
  const supported = SUPPORTED_LANGUAGES.map(l => l.code);
  return supported.includes(lang as SupportedLanguage) ? (lang as SupportedLanguage) : 'en';
}
