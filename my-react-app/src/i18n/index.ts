/**
 * App-wide i18n (react-i18next).
 *
 * How to add a language:
 *   1. Copy `locales/en.json` to `locales/<code>.json` and translate the values.
 *   2. Import it below and add it to `resources`.
 *   3. Add an entry to `APP_LANGUAGES` (shows it in the dashboard switcher).
 *   The backend receives the same code in `Accept-Language` (see utils/api.ts) and
 *   falls back to Bosnian for questions that have no translation in that language.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import bs from './locales/bs.json';
import en from './locales/en.json';
import trLocale from './locales/tr.json';

export const DEFAULT_LANGUAGE = 'bs';
export const LANGUAGE_STORAGE_KEY = 'cbam.lang';

/** Languages fully supported in the app (dashboard + calculation wizard). */
export const APP_LANGUAGES = [
  { code: 'bs', short: 'BS', label: 'Bosanski' },
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'tr', short: 'TR', label: 'Türkçe' },
] as const;

/** Languages the public landing page offers (all of them are also app languages since 2026-11-19). */
export const LANDING_LANGUAGES = ['en', 'bs', 'tr'] as const;
export type LandingLanguage = (typeof LANDING_LANGUAGES)[number];

const KNOWN_LANGUAGES: readonly string[] = LANDING_LANGUAGES;

function readStoredLanguage(): string {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && KNOWN_LANGUAGES.includes(stored)) return stored;
  } catch {
    // storage unavailable (private mode etc.) – use default
  }
  return DEFAULT_LANGUAGE;
}

function applyLanguage(lng: string) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    bs: { translation: bs },
    en: { translation: en },
    tr: { translation: trLocale },
  },
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyLanguage(i18n.language);
i18n.on('languageChanged', applyLanguage);

/** Current language code, used for the `Accept-Language` request header. */
export function getCurrentLanguage(): string {
  return i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;
}

export default i18n;

/** Language forced by {@link withLanguage} for the duration of a synchronous call, else null. */
let forcedLanguage: string | null = null;

/** Translate outside React components (module-level helpers, validation messages). */
export function tr(key: string, options?: Record<string, unknown>): string {
  const t = forcedLanguage ? i18n.getFixedT(forcedLanguage) : i18n.t;
  return (t as unknown as (k: string, o?: Record<string, unknown>) => string)(key, options);
}

/**
 * Runs `fn` with {@link tr} answering in `lng` (e.g. 'en' for PDF / CSV exports, whose PDF font has
 * no glyphs for ş, ğ, ı, č, ć, đ), without changing the UI language.
 */
export function withLanguage<T>(lng: string, fn: () => T): T {
  const prev = forcedLanguage;
  forcedLanguage = lng;
  try {
    return fn();
  } finally {
    forcedLanguage = prev;
  }
}

/**
 * A code → label record whose values are read from the locale files on every access,
 * so module-level label maps follow the current language (components re-render via useTranslation).
 */
export function lazyLabels<K extends string>(prefix: string, codes: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  codes.forEach((code) => {
    Object.defineProperty(out, code, { enumerable: true, get: () => tr(`${prefix}.${code}`) });
  });
  return out;
}

/** `{ value, label }` option list with a lazily translated label (see lazyLabels). */
export function lazyOptions(prefix: string, values: readonly string[]): { value: string; label: string }[] {
  return values.map((value) => {
    const o = { value } as { value: string; label: string };
    Object.defineProperty(o, 'label', { enumerable: true, get: () => tr(`${prefix}.${value}`) });
    return o;
  });
}

/**
 * Display label for a stored product category name (e.g. 'Iron and Steel').
 * The stored name drives routing (backend value_text_equals) and must never be translated itself.
 */
export function productCategoryLabel(name: string | null | undefined): string {
  if (!name) return '';
  return tr(`product.categoryName.${name}`, { defaultValue: name });
}
