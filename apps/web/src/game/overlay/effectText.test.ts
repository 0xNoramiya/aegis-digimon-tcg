import { describe, expect, it } from "vitest";
import { cardEffectClauseForTiming, playerFacingEffectClause } from "./effectText";

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
