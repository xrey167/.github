/// i18n bootstrap. Default language is German (matches the app's
/// historical UI strings); English is the secondary locale. Both
/// bundles are bundled at build time — no async loading — because
/// translations are tiny and we want the very first paint already
/// localised.
///
/// Detection order: localStorage `appLocale` → navigator language → de.

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import de from "./de.json";
import en from "./en.json";

export const SUPPORTED_LOCALES = ["de", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = "appLocale";

export function initI18n(): typeof i18n {
  if (i18n.isInitialized) return i18n;

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        de: { translation: de },
        en: { translation: en },
      },
      fallbackLng: "de",
      supportedLngs: SUPPORTED_LOCALES as unknown as string[],
      // Strict mode — i18next would otherwise try regional variants
      // (de-DE, de-AT) which aren't in our bundle and waste a fetch.
      load: "languageOnly",
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: LOCALE_STORAGE_KEY,
        caches: ["localStorage"],
      },
      interpolation: {
        // React already escapes; double-escaping mangles things like
        // single-quoted strings inside templates.
        escapeValue: false,
      },
      // Tests don't have a real DOM language detector by default.
      returnNull: false,
    });

  return i18n;
}

/// Programmatic switch. The detector also persists to localStorage
/// automatically once `caches: ['localStorage']` fires; this wrapper
/// makes the call site explicit and lets tests stub it.
export function setLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private-mode browsers reject localStorage writes; the language
    // change still applies for the session.
  }
}

export function getLocale(): Locale {
  const raw = (i18n.language ?? "de").slice(0, 2);
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : "de";
}
