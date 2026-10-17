import { getDictionaryValue } from "@/i18n/getDictionaryValue";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";
import { normalizePrintedTextKey } from "@/i18n/normalizePrintedTextKey";
import { findTranslatedCardClause } from "@/i18n/findTranslatedCardClause";

type Params = { text: string; translations?: CardTranslationData; cardId?: string };

export function getTranslatedCardText({ text, translations, cardId }: Params): string {
  const cardText = cardId ? getDictionaryValue({ dictionary: translations?.byCard, key: cardId }) : undefined;
  const translated =
    getDictionaryValue({ dictionary: cardText, key: normalizePrintedTextKey(text) }) ??
    getDictionaryValue({ dictionary: translations?.text, key: normalizePrintedTextKey(text) });
  const resolved =
    translated ||
    findTranslatedCardClause({ text, translations, cardId }) ||
    text.replace(/[^\r\n]+/g, (line) => {
      return (
        getDictionaryValue({ dictionary: cardText, key: normalizePrintedTextKey(line) }) ||
        getDictionaryValue({ dictionary: translations?.text, key: normalizePrintedTextKey(line) }) ||
        line
      );
    });
  if (resolved === text) {
    return text;
  }
  return resolved
    .replace(/[【［]([^】］]+)[】］]/g, "[$1]")
    .replace(
      /≪([^≫]+)≫|《([^》]+)》/g,
      (_, japanese: string | undefined, chinese: string | undefined) => `＜${japanese ?? chinese}＞`,
    );
}
