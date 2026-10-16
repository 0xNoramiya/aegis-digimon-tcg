import { useContext, useEffect, useState } from "react";
import { I18nContext } from "@/i18n/I18nContext";
import { getCardTranslationCache } from "@/i18n/getCardTranslationCache";
import { loadCardTranslations } from "@/i18n/loadCardTranslations";
import { loadPrintedCardTranslations } from "@/i18n/loadPrintedCardTranslations";
import type { Locale } from "@/i18n/locales";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";

type Params = { includePrintedText?: boolean; locale?: Locale };
type Loaded = { locale: Locale; printed: boolean; data: CardTranslationData };

export function useCardTranslations({ includePrintedText = false, locale }: Params = {}) {
  const context = useContext(I18nContext);
  const effectiveLocale = locale ?? context?.locale ?? "en";
  const cache = getCardTranslationCache(effectiveLocale);
  const [loaded, setLoaded] = useState<Loaded>();
  useEffect(() => {
    if (!cache) {
      return;
    }
    let cancelled = false;
    const load = includePrintedText ? loadPrintedCardTranslations : loadCardTranslations;
    void load(effectiveLocale)
      .then((data) => {
        if (!cancelled) {
          setLoaded({ locale: effectiveLocale, printed: includePrintedText, data });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cache, effectiveLocale, includePrintedText]);
  if (!cache) {
    return undefined;
  }
  if (loaded?.locale === effectiveLocale && loaded.printed === includePrintedText) {
    return loaded.data;
  }
  return includePrintedText ? (cache.printedData ?? cache.data) : cache.data;
}
