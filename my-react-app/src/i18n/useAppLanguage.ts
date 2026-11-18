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
