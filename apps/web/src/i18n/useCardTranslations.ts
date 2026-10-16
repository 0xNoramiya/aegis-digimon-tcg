import type { Locale } from "@/i18n/locales";
import { useContext, useEffect, useState } from "react";
import { I18nContext } from "@/i18n/I18nContext";
import { cardTranslationCache } from "@/i18n/cardTranslationCache";
import { loadCardTranslations } from "@/i18n/loadCardTranslations";
import { loadPrintedCardTranslations } from "@/i18n/loadPrintedCardTranslations";

type Params = { includePrintedText?: boolean; locale?: Locale };

export function useCardTranslations({ includePrintedText = false, locale }: Params = {}) {
  const context = useContext(I18nContext);
  const enabled = (locale ?? context?.locale) === "zh-CN";
  const [translations, setTranslations] = useState(() => {
    if (includePrintedText) {
      return cardTranslationCache.printedData ?? cardTranslationCache.data;
    }
    return cardTranslationCache.data;
  });
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    const load = includePrintedText ? loadPrintedCardTranslations : loadCardTranslations;
    load()
      .then((data) => {
        if (!cancelled) {
          setTranslations(data);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, includePrintedText]);
  return enabled ? translations : undefined;
}
