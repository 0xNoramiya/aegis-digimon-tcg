import { getDictionaryValue } from "@/i18n/getDictionaryValue";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";
import { normalizePrintedTextKey } from "@/i18n/normalizePrintedTextKey";

type Params = { text: string; translations?: CardTranslationData };

export function getTranslatedCardText({ text, translations }: Params): string {
  const translated = getDictionaryValue({ dictionary: translations?.text, key: normalizePrintedTextKey(text) });
  const resolved =
    translated ||
    text.replace(/[^\r\n]+/g, (line) => {
      return getDictionaryValue({ dictionary: translations?.text, key: normalizePrintedTextKey(line) }) || line;
    });
  if (resolved === text) {
    return text;
  }
  return resolved.replace(/[【［]([^】］]+)[】］]/g, "[$1]").replace(/《([^》]+)》/g, "＜$1＞");
}
