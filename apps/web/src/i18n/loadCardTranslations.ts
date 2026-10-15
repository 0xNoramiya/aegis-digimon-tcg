import { cardTranslationCache } from "@/i18n/cardTranslationCache";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";

export function loadCardTranslations(): Promise<CardTranslationData> {
  if (!cardTranslationCache.pending) {
    cardTranslationCache.pending = import("@/i18n/cardTranslationBundle")
      .then(({ cardTranslationData }) => {
        cardTranslationCache.data = cardTranslationData;
        return cardTranslationData;
      })
      .catch((error: unknown) => {
        cardTranslationCache.pending = undefined;
        throw error;
      });
  }
  return cardTranslationCache.pending;
}
