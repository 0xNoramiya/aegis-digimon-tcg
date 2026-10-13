import { dictionaryCache } from "@/i18n/dictionaryCache";
import { en } from "@/i18n/en";
import type { Locale } from "@/i18n/locales";
import type { Translate, TranslationParams } from "@/i18n/translationTypes";

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

export function translator(locale: Locale): Translate {
  const dictionary = dictionaryCache.get(locale) ?? en;
  return (key, params) => interpolate(dictionary[key] ?? en[key] ?? key, params);
}
