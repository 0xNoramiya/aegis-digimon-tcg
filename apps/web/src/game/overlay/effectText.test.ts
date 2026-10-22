import { describe, expect, it } from "vitest";
import { cardEffectClauseForTiming, noticeEffectClause, playerFacingEffectClause } from "./effectText";

describe("printed clause lookup", () => {
  it("stops a clause at a timing printed with a typographic apostrophe (BT13-103 [End of Opponent’s Turn])", () => {
    expect(cardEffectClauseForTiming("BT13-103", "YourTurn")).toBe(
      "[Your Turn] When a card with [Belphemon] in its name would be played, by deleting 1 of your Digimon with [Gizmon] in its name, reduce the play cost by the play cost of the deleted Digimon.",
    );
    expect(cardEffectClauseForTiming("BT13-103", "EndOfOpponentsTurn")).toMatch(
      /^\[End of Opponent’s Turn\]\[Once Per Turn\] ＜Draw 1＞/,
    );
  });
});

it("feedback #51: donor provenance still validates against printed text and ordinary GX text remains unchanged", () => {
  const gx = cardEffectClauseForTiming("BT10-112", "WhenDigivolving");
  expect(playerFacingEffectClause({ cardId: "BT10-112", timing: "WhenDigivolving", description: undefined })).toBe(gx);
  const donor = cardEffectClauseForTiming("EX13-061", "WhenDigivolving");
  expect(
    playerFacingEffectClause({
      cardId: "EX13-061",
      timing: "WhenDigivolving",
      description: "Unprinted invented effect",
      effectTextPart: "Unprinted invented part",
    }),
  ).toBe(donor);
});

it.each(["WhenDigivolving", "WhenAttacking"])("shows Mastemon free play as a separate sentence for %s", (timing) => {
  const part =
    "You may play 1 purple or yellow Digimon card with 6000 DP or less from your hand or trash without paying the cost.";
  expect(playerFacingEffectClause({ cardId: "P-187", timing, description: undefined, effectTextPart: part })).toBe(
    part,
  );
  expect(
    playerFacingEffectClause({
      cardId: "P-187",
      timing,
      description: undefined,
      effectTextPart: part.replace("6000", "7000"),
    }),
  ).not.toContain("7000");
});

const barbamonDeletion =
  "[All Turns] [Once Per Turn] When your opponent's hand is trashed from, you may delete all of their lowest level Digimon.";

it.each([
  undefined,
  barbamonDeletion,
  `${barbamonDeletion}\n＜Assembly -5＞ 3 [Greed] trait cards w/different levels.`,
])("omits the trailing Assembly requirement from Barbamon's modal and notice: %s", (description) => {
  const input = { cardId: "EX14-054", timing: "AllTurns", description };
  expect(playerFacingEffectClause(input)).toBe(barbamonDeletion);
  expect(noticeEffectClause(input)).toBe(barbamonDeletion);
  expect(cardEffectClauseForTiming("EX14-054", "AllTurns")).toContain("＜Assembly -5＞");
});

it("keeps Barbamon's emphasized deletion passage without appending its Assembly requirement", () => {
  const effectTextPart = "When your opponent's hand is trashed from, you may delete all of their lowest level Digimon.";
  const input = { cardId: "EX14-054", timing: "AllTurns", description: undefined, effectTextPart };
  expect(playerFacingEffectClause(input)).toBe(effectTextPart);
  expect(noticeEffectClause(input)).toBe(effectTextPart);
});

it("shows a linked card's protection clause, not its main [All Turns] clause, when the prompt sends only the cost (EX10-030)", () => {
  expect(
    playerFacingEffectClause({
      cardId: "EX10-030",
      timing: "AllTurns",
      description: "by trashing 1 of its link cards",
    }),
  ).toBe(
    "[All Turns] [Once Per Turn] When this Digimon would leave the battle area, by trashing 1 of its link cards, it doesn't leave.",
  );
});

it("shows the protection clause, not the first [All Turns] clause, when the prompt sends only the cost (BT24-101)", () => {
  expect(
    playerFacingEffectClause({
      cardId: "BT24-101",
      timing: "AllTurns",
      description: "by trashing your top security card",
    }),
  ).toBe(
    "[All Turns] [Once Per Turn] When any of your [TS] trait Digimon or Tamers would leave the battle area, by trashing your top security card, they don't leave.",
  );
});
