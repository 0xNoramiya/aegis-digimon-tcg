import { getDictionaryValue } from "@/i18n/getDictionaryValue";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";
import { normalizePrintedTextKey } from "@/i18n/normalizePrintedTextKey";
import { getCardDefinition } from "@aegis/shared/cards/registry";

type Params = { text: string; translations?: CardTranslationData; cardId?: string };

export function getTranslatedCardText({ text, translations, cardId }: Params): string {
  const translated = getDictionaryValue({ dictionary: translations?.text, key: normalizePrintedTextKey(text) });
  const resolved =
    translated ||
    findTranslatedClause({ text, translations, cardId }) ||
    text.replace(/[^\r\n]+/g, (line) => {
      return getDictionaryValue({ dictionary: translations?.text, key: normalizePrintedTextKey(line) }) || line;
    });
  if (resolved === text) {
    return text;
  }
  return resolved.replace(/[【［]([^】］]+)[】］]/g, "[$1]").replace(/《([^》]+)》/g, "＜$1＞");
}

function findTranslatedClause({ text, translations, cardId }: Params): string | undefined {
  if (!cardId || !translations) {
    return undefined;
  }
  const card = getCardDefinition(cardId);
  if (!card) {
    return undefined;
  }
  const matches = new Set<string>();
  for (const full of [
    card.effectText,
    card.inheritedEffectText,
    card.securityEffectText,
    card.optionEffect,
    card.linkEffect,
  ]) {
    if (!full) {
      continue;
    }
    const translated = getDictionaryValue({ dictionary: translations.text, key: normalizePrintedTextKey(full) });
    if (!translated) {
      continue;
    }
    const sourceGroups = full.split(/(?:\r\n|\r|\n)\s*(?=\[)/).map((group) => group.trim());
    const targetGroups = translated.split(/(?:\r\n|\r|\n)\s*(?=【|［|\[)/).map((group) => group.trim());
    if (sourceGroups.length !== targetGroups.length) {
      continue;
    }
    for (const [index, group] of sourceGroups.entries()) {
      if (normalizePrintedTextKey(group) === normalizePrintedTextKey(text)) {
        matches.add(targetGroups[index]!);
      }
    }
  }
  return matches.size === 1 ? [...matches][0] : undefined;
}
