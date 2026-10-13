export const LOCALES = ["en", "pt-BR", "es", "it", "ko", "ja", "zh-CN", "zh-TW", "fr", "de", "id"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
  it: "Italiano",
  ko: "한국어",
  ja: "日本語",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  fr: "Français",
  de: "Deutsch",
  id: "Bahasa Indonesia",
};

export const LOCALE_STORAGE_KEY = "aegis:locale";
