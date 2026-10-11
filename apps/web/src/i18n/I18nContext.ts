import { createContext } from "react";
import type { Locale } from "@/i18n/locales";
import type { Translate } from "@/i18n/translationTypes";

export interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

export const I18nContext = createContext<I18nValue | null>(null);
