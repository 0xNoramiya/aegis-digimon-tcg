import { en } from "@/i18n/en";
import type { Locale } from "@/i18n/locales";
import type { Dictionary } from "@/i18n/translationTypes";

export const dictionaryLoaders: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => en,
  "pt-BR": () => import("@/i18n/pt-BR").then((module) => module.ptBR),
  es: () => import("@/i18n/es").then((module) => module.es),
  it: () => import("@/i18n/it").then((module) => module.it),
  ko: () => import("@/i18n/ko").then((module) => module.ko),
  ja: () => import("@/i18n/ja").then((module) => module.ja),
  "zh-CN": () => import("@/i18n/zh-CN").then((module) => module.zhCN),
  "zh-TW": () => import("@/i18n/zh-TW").then((module) => module.zhTW),
  fr: () => import("@/i18n/fr").then((module) => module.fr),
  de: () => import("@/i18n/de").then((module) => module.de),
  id: () => import("@/i18n/id").then((module) => module.id),
};
