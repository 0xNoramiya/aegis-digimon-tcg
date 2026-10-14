import { describe, expect, it } from "vitest";
import { getCardDefinition } from "#shared/cards/registry";
import { isCardInQueriedFieldGroup } from "#shared/cards/isCardInQueriedFieldGroup";

function isInGroup(cardId: string, query: string): boolean {
  return isCardInQueriedFieldGroup({ card: getCardDefinition(cardId)!, query });
}

describe("isCardInQueriedFieldGroup", () => {
  it("includes a Digimon whose trait is the group abbreviation", () => {
    expect(getCardDefinition("P-222")?.types).toContain("WG");

    expect(isInGroup("P-222", "wind guardians")).toBe(true);
    expect(isInGroup("P-222", "WG")).toBe(true);
  });

  it("includes the group's own field Option card", () => {
    expect(isInGroup("EX8-068", "Deep Savers")).toBe(true);
    expect(isInGroup("EX12-072", "me")).toBe(true);
  });

  it("excludes cards outside the queried group", () => {
    expect(isInGroup("P-222", "deep savers")).toBe(false);
    expect(isInGroup("AD1-001", "DS")).toBe(false);
  });

  it("excludes every card when the query names no group", () => {
    expect(isInGroup("P-222", "Rosemon")).toBe(false);
  });
});
