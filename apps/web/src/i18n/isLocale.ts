import { LOCALES, type Locale } from "@/i18n/locales";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
