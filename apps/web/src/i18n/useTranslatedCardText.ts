import { getTranslatedCardText } from "@/i18n/getTranslatedCardText";
import { useCardTranslations } from "@/i18n/useCardTranslations";

type Params = { text: string; cardId?: string };

export function useTranslatedCardText() {
  const translations = useCardTranslations({ includePrintedText: true });
  return function translateCardText({ text, cardId }: Params): string {
    return getTranslatedCardText({ text, cardId, translations });
  };
}
