import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isLanguage, languageDirection, type Language } from './index';

/**
 * Keeps <html lang> and <html dir> in step with the active language. i18next
 * also listens to changes, but the initial render needs this before paint.
 */
export function useDocumentLanguage(): Language {
  const { i18n } = useTranslation();
  const language: Language = isLanguage(i18n.language) ? i18n.language : 'en';

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = languageDirection(language);
  }, [language]);

  return language;
}
