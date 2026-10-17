import { getCardDefinition } from "@aegis/shared/cards/registry";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";
import { getDictionaryValue } from "@/i18n/getDictionaryValue";
import { normalizePrintedTextKey } from "@/i18n/normalizePrintedTextKey";

type Params = { text: string; translations?: CardTranslationData; cardId?: string };
type Clause = { text: string; signature: string };

const timingLabels: Readonly<Record<string, string>> = {
  "On Play": "登场时",
  "When Digivolving": "进化时",
  "When Attacking": "攻击时",
  "On Deletion": "消灭时",
  "All Turns": "双方的回合",
  "Your Turn": "我方的回合",
  "Opponent's Turn": "对方的回合",
  "End of Your Turn": "我方的回合结束时",
  "End of Opponent's Turn": "对方的回合结束时",
  "End of All Turns": "双方的回合结束时",
  "Start of Your Turn": "我方的回合开始时",
  "Start of Opponent's Turn": "对方的回合开始时",
  "Start of Your Main Phase": "我方的主要阶段开始时",
  "Start of Main Phase": "主要阶段开始时",
  "Start of Opponent's Main Phase": "对方的主要阶段开始时",
  "End of Attack": "攻击结束时",
  "When Moving": "移动时",
  "When Linking": "连接时",
  "Once Per Turn": "每回合1次",
  Security: "安防",
  Main: "主要",
  Counter: "反击",
  Hand: "手牌",
  Trash: "废弃区",
  Breeding: "育成区",
  养成: "育成区",
  链接时: "连接时",
};

export function findTranslatedCardClause({ text, translations, cardId }: Params): string | undefined {
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
    const cardText = getDictionaryValue({ dictionary: translations.byCard, key: cardId });
    const translated =
      getDictionaryValue({ dictionary: cardText, key: normalizePrintedTextKey(full) }) ??
      getDictionaryValue({ dictionary: translations.text, key: normalizePrintedTextKey(full) });
    if (!translated) {
      continue;
    }
    const source = getClauses(full);
    const target = getClauses(translated);
    if (
      source
        .map((clause) => clause.signature)
        .sort()
        .join("|") !==
      target
        .map((clause) => clause.signature)
        .sort()
        .join("|")
    ) {
      continue;
    }
    const requested = source.find((clause) => normalizePrintedTextKey(clause.text) === normalizePrintedTextKey(text));
    if (!requested || source.filter((clause) => clause.signature === requested.signature).length !== 1) {
      continue;
    }
    const candidates = target.filter((clause) => clause.signature === requested.signature);
    if (candidates.length === 1) {
      matches.add(candidates[0]!.text);
    }
  }
  return matches.size === 1 ? [...matches][0] : undefined;
}

function getClauses(text: string): Clause[] {
  const normalized = text.replace(/[【［]/g, "[").replace(/[】］]/g, "]");
  return normalized.split(/(?:\r\n|\r|\n)\s*(?=\[)/).flatMap((part) => {
    const text = part.trim();
    const header = text.match(/^(?:\[[^\]]+\]\s*)+/)?.[0];
    if (!header) {
      return [];
    }
    const labels = [...header.matchAll(/\[([^\]]+)\]/g)].map((match) => {
      const label = match[1]!.trim();
      return (
        getDictionaryValue({ dictionary: timingLabels, key: label }) ??
        Object.values(timingLabels).find((value) => value === label)
      );
    });
    if (labels.some((label) => !label) || labels.every((label) => label === "每回合1次")) {
      return [];
    }
    const delayed = /^\s*(?:＜Delay＞|<Delay>|《延迟》|≪延迟≫|＜延迟＞|<延迟>)/.test(text.slice(header.length));
    const signature = JSON.stringify({ labels: labels.sort(), delayed });
    return [{ text, signature }];
  });
}
