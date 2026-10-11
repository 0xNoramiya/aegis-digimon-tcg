import type { Locale } from "@/i18n/locales";
import type { TranslationKey } from "@/i18n/translationTypes";
import { en } from "@/i18n/en";
import { ptBR } from "@/i18n/pt-BR";
import { es } from "@/i18n/es";
import { it } from "@/i18n/it";
import { ko } from "@/i18n/ko";
import { ja } from "@/i18n/ja";
import { zhCN } from "@/i18n/zh-CN";
import { zhTW } from "@/i18n/zh-TW";
import { fr } from "@/i18n/fr";
import { de } from "@/i18n/de";
import { id } from "@/i18n/id";

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  en: en,
  "pt-BR": ptBR,
  es: es,
  it: it,
  ko: ko,
  ja: ja,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  fr: fr,
  de: de,
  id: id,
};
