import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext, type I18nValue } from "@/i18n/I18nContext";
import { dictionaryCache } from "@/i18n/dictionaryCache";
import { loadDictionary } from "@/i18n/loadDictionary";
import { loadLocale } from "@/i18n/loadLocale";
import { saveLocale } from "@/i18n/saveLocale";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { translator } from "@/i18n/translator";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);
  const [translatedLocale, setTranslatedLocale] = useState<Locale>(() =>
    dictionaryCache.has(locale) ? locale : DEFAULT_LOCALE,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    loadDictionary(locale)
      .then(() => {
        if (!cancelled) {
          setTranslatedLocale(locale);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: translator(translatedLocale) }),
    [locale, setLocale, translatedLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
