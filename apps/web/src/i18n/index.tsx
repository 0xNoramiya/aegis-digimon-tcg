/* The i18n runtime: one dictionary per locale, a `t(key, params)` translator, and
   the provider/hook the whole client reads from. Card names and printed card text
   come from @aegis/shared and stay in English — only chrome is translated. */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { I18nContext, type I18nValue } from "@/i18n/I18nContext";
import type { Translate, TranslationKey, TranslationParams } from "@/i18n/translationTypes";
import { DEFAULT_LOCALE, loadLocale, saveLocale, type Locale } from "./locales";
import { en } from "./en";
import { ptBR } from "./pt-BR";
import { es } from "./es";
import { it } from "./it";

export type { Translate, TranslationKey, TranslationParams } from "@/i18n/translationTypes";

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = {
  en,
  "pt-BR": ptBR,
  es,
  it,
};

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

/** A standalone translator, for code that runs outside the React tree. */
export function translator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  return (key, params) => interpolate(dictionary[key] ?? en[key] ?? key, params);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setLocaleState(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t: translator(locale) }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export { useTranslation } from "@/i18n/useTranslation";

export { LOCALES, LOCALE_LABELS, type Locale } from "./locales";
