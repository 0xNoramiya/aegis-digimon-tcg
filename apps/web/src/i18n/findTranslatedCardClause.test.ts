import { describe, expect, it, vi } from "vitest";
import type { CardDefinition } from "@aegis/shared";
import { findTranslatedCardClause } from "@/i18n/findTranslatedCardClause";
import { normalizePrintedTextKey } from "@/i18n/normalizePrintedTextKey";

const sharedClause = "[End of All Turns] You may play 1 [Eiji Nagasumi] from this Digimon's digivolution cards.";
const inheritedEffectText = `[All Turns] This Digimon gains ＜Piercing＞.\n${sharedClause}`;
const securityEffectText = `[Security] Play this card without paying the cost.\n${sharedClause}`;
const sharedClauseCard = {
  cardId: "TEST-SHARED-CLAUSE",
  nameEn: "Shared Clause Tamer",
  kinds: ["Tamer"],
  colors: ["Red"],
  inheritedEffectText,
  securityEffectText,
} as unknown as CardDefinition;

vi.mock("@aegis/shared/cards/registry", async (importOriginal) => {
  const original = await importOriginal<typeof import("@aegis/shared/cards/registry")>();
  return {
    ...original,
    getCardDefinition: (cardId: string) =>
      cardId === sharedClauseCard.cardId ? sharedClauseCard : original.getCardDefinition(cardId),
  };
});

describe("findTranslatedCardClause", () => {
  it("rejects conflicting translations of the same clause in different text boxes", () => {
    const translations = {
      byCard: {},
      text: {
        [normalizePrintedTextKey(inheritedEffectText)]:
          "【双方的回合】获得＜穿透＞。\n【双方的回合结束时】进化源译文。",
        [normalizePrintedTextKey(securityEffectText)]: "【安防】不支付费用登场。\n【双方的回合结束时】安防译文。",
      },
    };

    expect(
      findTranslatedCardClause({ text: sharedClause, translations, cardId: sharedClauseCard.cardId } as Parameters<
        typeof findTranslatedCardClause
      >[0]),
    ).toBeUndefined();
    expect(
      findTranslatedCardClause({
        text: sharedClause,
        translations,
        cardId: sharedClauseCard.cardId,
        field: "inheritedEffectText",
      } as Parameters<typeof findTranslatedCardClause>[0]),
    ).toBe("[双方的回合结束时]进化源译文。");
  });
});
