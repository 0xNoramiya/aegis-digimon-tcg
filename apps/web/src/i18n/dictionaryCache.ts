import { en } from "@/i18n/en";
import type { Locale } from "@/i18n/locales";
import type { Dictionary } from "@/i18n/translationTypes";

export const dictionaryCache = new Map<Locale, Dictionary>([["en", en]]);
