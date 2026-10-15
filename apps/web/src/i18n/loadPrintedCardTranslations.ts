import { cardTranslationCache } from "@/i18n/cardTranslationCache";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";
import { loadCardTranslations } from "@/i18n/loadCardTranslations";

export function loadPrintedCardTranslations(): Promise<CardTranslationData> {
  if (!cardTranslationCache.printedPending) {
    cardTranslationCache.printedPending = Promise.all([loadCardTranslations(), import("@/i18n/cardText.zh.json")])
      .then(([data, text]) => {
        const translations = { ...data, text: text.default };
        cardTranslationCache.printedData = translations;
        return translations;
      })
      .catch((error: unknown) => {
        cardTranslationCache.printedPending = undefined;
        throw error;
      });
  }
  return cardTranslationCache.printedPending;
}
