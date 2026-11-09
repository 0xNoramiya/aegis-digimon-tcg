import { describe, expect, it } from "vitest";
import { allCards } from "#shared/cards/registry";

describe("printed Tamer security text", () => {
  it("keeps a Tamer's main-box [Security] play as its only security text", () => {
    const duplicated = allCards().filter(
      (card) => card.kinds.includes("Tamer") && card.effectText?.includes("[Security]") && card.securityEffectText,
    );

    expect(allCards().find((card) => card.cardId === "BT20-089")?.effectText).toContain("[Security]");
    expect(duplicated.map((card) => card.cardId)).toEqual([]);
  });
});
