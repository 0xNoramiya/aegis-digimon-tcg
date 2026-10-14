import type { en } from "@/i18n/en";

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;
export type TranslationParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;
