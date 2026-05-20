import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import hi from './locales/hi.json'
import kn from './locales/kn.json'
import te from './locales/te.json'
import ta from './locales/ta.json'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English',  nativeLabel: 'English',  flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi',    nativeLabel: 'हिन्दी',   flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada',  nativeLabel: 'ಕನ್ನಡ',    flag: '🇮🇳' },
  { code: 'te', label: 'Telugu',   nativeLabel: 'తెలుగు',   flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil',    nativeLabel: 'தமிழ்',    flag: '🇮🇳' },
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hi: { translation: hi },
                 kn: { translation: kn }, te: { translation: te },
                 ta: { translation: ta } },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'kn', 'te', 'ta'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'rhc-language',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
