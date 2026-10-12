import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext, type I18nValue } from "@/i18n/I18nContext";
import { loadLocale } from "@/i18n/loadLocale";
import { saveLocale } from "@/i18n/saveLocale";
import type { Locale } from "@/i18n/locales";
import { translator } from "@/i18n/translator";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t: translator(locale) }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
