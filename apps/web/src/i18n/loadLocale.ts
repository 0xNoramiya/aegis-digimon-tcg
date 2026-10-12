import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from "@/i18n/locales";
import { isLocale } from "@/i18n/isLocale";
import { matchLocale } from "@/i18n/matchLocale";

export function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {}
  if (typeof navigator !== "undefined") {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const match = matchLocale(tag ?? "");
      if (match) return match;
    }
  }
  return DEFAULT_LOCALE;
}
