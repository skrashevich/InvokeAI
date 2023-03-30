import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import translationEN from '../dist/locales/en.json';

if (import.meta.env.MODE === 'package') {
  i18n.use(initReactI18next).init({
    lng: 'en',
    resources: {
      en: { translation: translationEN },
    },
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
} else {
  i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      debug: false,
      backend: {
        loadPath: '/locales/{{lng}}.json',
      },
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    });
}

export default i18n;
