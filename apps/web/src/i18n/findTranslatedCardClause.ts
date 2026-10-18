import { getCardDefinition } from "@aegis/shared/cards/registry";
import { printedModalBullets } from "@aegis/shared/effects/printedClauses";
import type { CardTranslationData } from "@/i18n/cardTranslationTypes";
import { getDictionaryValue } from "@/i18n/getDictionaryValue";
import { normalizePrintedTextKey } from "@/i18n/normalizePrintedTextKey";
import { getPrintedClauseGroupTexts } from "@/game/getPrintedClauseGroupTexts";
import { isEmbeddedPrintedTiming } from "@/game/isEmbeddedPrintedTiming";

type Params = { text: string; translations?: CardTranslationData; cardId?: string };
type Clause = { text: string; signature: string };
type ClauseParams = { text: string; source?: boolean };

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
    const source = getClauses({ text: full, source: true });
    const target = getClauses({ text: translated });
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
    const requestedKey = normalizePrintedTextKey(text);
    const requestedClauses = source.filter(
      (clause) =>
        normalizePrintedTextKey(clause.text) === requestedKey ||
        printedModalBullets(clause.text).some((bullet) => normalizePrintedTextKey(bullet) === requestedKey),
    );
    const requested = requestedClauses[0];
    if (
      requestedClauses.length !== 1 ||
      !requested ||
      source.filter((clause) => clause.signature === requested.signature).length !== 1
    ) {
      continue;
    }
    const candidates = target.filter((clause) => clause.signature === requested.signature);
    if (candidates.length === 1) {
      if (normalizePrintedTextKey(requested.text) === requestedKey) {
        matches.add(candidates[0]!.text);
        continue;
      }
      const sourceBullets = printedModalBullets(requested.text);
      const targetBullets = printedModalBullets(candidates[0]!.text.replace(/(^|[\r\n])[ \t]*[·•]/g, "$1・"));
      const indexes = sourceBullets.flatMap((bullet, index) =>
        normalizePrintedTextKey(bullet) === requestedKey ? [index] : [],
      );
      if (indexes.length === 1 && sourceBullets.length === targetBullets.length) {
        matches.add(targetBullets[indexes[0]!]!);
      }
    }
  }
  return matches.size === 1 ? [...matches][0] : undefined;
}

function getClauses({ text, source = false }: ClauseParams): Clause[] {
  const normalized = text.replace(/[【［]/g, "[").replace(/[】］]/g, "]");
  const parts = source ? getPrintedClauseGroupTexts(normalized) : getTranslatedParts(normalized);
  return parts.flatMap((part) => {
    const clauseText = part.trim();
    const labels: string[] = [];
    let headerEnd = 0;
    for (const match of clauseText.matchAll(/\[([^\]\r\n]+)\]/g)) {
      if (clauseText.slice(headerEnd, match.index).trim()) {
        break;
      }
      const label = getTimingLabel(match[1]!.trim());
      if (!label) {
        break;
      }
      labels.push(label);
      headerEnd = match.index + match[0].length;
    }
    if (!labels.length || labels.every((label) => /^每回合\d+次$/.test(label))) {
      return [];
    }
    const delayed = /^\s*(?:＜Delay＞|<Delay>|《延迟》|≪延迟≫|＜延迟＞|<延迟>)/.test(clauseText.slice(headerEnd));
    const signature = JSON.stringify({ labels: labels.sort(), delayed });
    return [{ text: clauseText, signature }];
  });
}

function getTimingLabel(label: string): string | undefined {
  label = label.replace(/[’‘]/g, "'");
  const count = label.match(/^(?:(Once|Twice)|(\d+)\s+Times?)\s+Per Turn$/i);
  if (count) {
    let value = count[2];
    if (count[1]) {
      value = count[1].toLowerCase() === "once" ? "1" : "2";
    }
    return `每回合${value}次`;
  }
  return (
    getDictionaryValue({ dictionary: timingLabels, key: label }) ??
    Object.values(timingLabels).find((value) => value === label) ??
    (/^每回合\d+次$/.test(label) ? label : undefined)
  );
}

function getTranslatedParts(text: string): string[] {
  const groups: { start: number; end: number }[] = [];
  for (const match of text.matchAll(/\[([^\]\r\n]+)\]/g)) {
    const label = match[1]!.trim();
    const metadata =
      /^(?:规则|Rule|进化|Digivolve|数码合体|DigiXros|组装|Assembly|应用合体|App Fusion|连接|Link)(?:\b|[-−–：:])/u.test(
        label,
      );
    const lineStart = !text.slice(text.lastIndexOf("\n", match.index) + 1, match.index).trim();
    if (!getTimingLabel(label) && !metadata && !lineStart) {
      continue;
    }
    if (isEmbeddedPrintedTiming({ text, index: match.index })) {
      continue;
    }
    const following = text.slice(match.index + match[0].length);
    if (
      /^\s*(?:(?:\/|或|和|及|、|or\b|and\b)?\s*\[[^\]]+\]\s*)*(?:的?效果|技能|effects?\b|skills?\b)/i.test(following)
    ) {
      continue;
    }
    const previous = groups.at(-1);
    const gap = text.slice(previous?.end ?? 0, match.index).trim();
    if (getTimingLabel(label) && !metadata && !lineStart && gap && !/[。.!?！？:：;；)）＞>》]$/.test(gap)) {
      continue;
    }
    if (previous && !text.slice(previous.end, match.index).trim()) {
      previous.end = match.index + match[0].length;
    } else {
      groups.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return groups.map((group, index) => text.slice(group.start, groups[index + 1]?.start ?? text.length).trim());
}
