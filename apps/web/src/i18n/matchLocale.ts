import { LOCALES, type Locale } from "@/i18n/locales";

export function matchLocale(languageTag: string): Locale | undefined {
  const tag = languageTag.toLowerCase().replaceAll("_", "-");
  const exact = LOCALES.find((locale) => locale.toLowerCase() === tag);
  if (exact) return exact;
  const subtags = tag.split("-");
  if (subtags[0] === "zh") {
    if (subtags.includes("hant")) return "zh-TW";
    if (subtags.includes("hans")) return "zh-CN";
    return subtags.some((subtag) => ["tw", "hk", "mo"].includes(subtag)) ? "zh-TW" : "zh-CN";
  }
  return LOCALES.find((locale) => locale.toLowerCase().split("-")[0] === subtags[0]);
}
