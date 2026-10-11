import { LOCALE_STORAGE_KEY, type Locale } from "@/i18n/locales";

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {}
}
