import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from './index';

/**
 * Current UI language as a hook value. Use it as an effect dependency so that data whose
 * texts the backend localizes (Accept-Language) is reloaded when the user switches language.
 */
export function useAppLanguage(): string {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;
}

/** Language codes of the public pages (Features, About, Pricing …): 'ju' is their code for BHS. */
export type PageLang = 'en' | 'ju' | 'tr';

export const pageLangFromApp = (lng: string | undefined): PageLang =>
  lng === 'tr' ? 'tr' : lng === 'en' ? 'en' : 'ju';

export const appLangFromPage = (lang: PageLang): string => (lang === 'ju' ? 'bs' : lang);

/**
 * Language of a public page, shared with the app: the page opens in the language chosen on the
 * landing page / dashboard, and switching it on the page switches the whole app.
 */
export function usePageLanguage(): [PageLang, (lang: PageLang) => void] {
  const { i18n } = useTranslation();
  const lang = pageLangFromApp(i18n.resolvedLanguage || i18n.language);
  return [lang, (next: PageLang) => { void i18n.changeLanguage(appLangFromPage(next)); }];
}
