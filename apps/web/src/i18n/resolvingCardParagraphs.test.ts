import { expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { getTranslatedCardText } from "@/i18n/getTranslatedCardText";
import { loadPrintedCardTranslations } from "@/i18n/loadPrintedCardTranslations";
import { noticeEffectClause } from "@/game/overlay/effectText";

it("translates Sangomon's resolving search without its inline Rule metadata", async () => {
  const card = getCardDefinition("BT19-017")!;
  const clause = noticeEffectClause({ cardId: card.cardId, timing: "OnPlay", description: undefined })!;
  const translations = await loadPrintedCardTranslations();
  const result = getTranslatedCardText({ text: clause, cardId: card.cardId, translations });
  expect(result).toBe(
    "[登场时]翻开我方卡组最上方的3张卡牌。将其中1张特征中包含“水栖”的卡牌和1张拥有“界放者”特征的卡牌加入手牌。剩余的卡牌放回到卡组最下方。",
  );
  expect(result).not.toContain("Trait:");
  const changed = clause.replace("top 3", "top 4");
  expect(getTranslatedCardText({ text: changed, cardId: card.cardId, translations })).toBe(changed);
});

it.each([
  ["BT15-035", "OnPlay"],
  ["BT19-019", "WhenDigivolving"],
  ["BT19-021", "OnPlay"],
  ["ST18-06", "OnPlay"],
])("translates the resolving clause before inline Rule metadata for %s", async (cardId, timing) => {
  const clause = noticeEffectClause({ cardId, timing, description: undefined })!;
  const translations = await loadPrintedCardTranslations();
  const result = getTranslatedCardText({ text: clause, cardId, translations });
  expect(result).toMatch(/[\u4e00-\u9fff]/);
  expect(result).not.toBe(clause);
  expect(result).not.toContain("[Rule]");
});

it("translates the opponent-turn blocker unsuspend selection clause", async () => {
  const card = getCardDefinition("P-144")!;
  const text = card.effectText!.slice(card.effectText!.indexOf("[Opponent's Turn]"));
  const translations = await loadPrintedCardTranslations();
  const translated = getTranslatedCardText({ text, cardId: card.cardId, translations });
  expect(translated).toContain("当攻击对象被变更时");
  expect(translated).toContain("转换为活跃状态");
  expect(translated).not.toContain("When an attack target");
  expect(
    getTranslatedCardText({ text: text.replace("＜Blocker＞", "< Blocker >"), cardId: card.cardId, translations }),
  ).toBe(translated);
});
