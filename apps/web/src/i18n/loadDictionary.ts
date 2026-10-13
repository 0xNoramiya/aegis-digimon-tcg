import { dictionaryCache } from "@/i18n/dictionaryCache";
import { dictionaryLoaders } from "@/i18n/dictionaryLoaders";
import type { Locale } from "@/i18n/locales";
import type { Dictionary } from "@/i18n/translationTypes";

export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  const cached = dictionaryCache.get(locale);
  if (cached) {
    return cached;
  }
  const dictionary = await dictionaryLoaders[locale]();
  dictionaryCache.set(locale, dictionary);
  return dictionary;
}
