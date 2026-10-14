import { describe, expect, it } from "vitest";
import { allCards } from "@aegis/shared";
import {
  DIGIVOLUTION_COST_FILTERS,
  HIGHEST_DIGIVOLUTION_COST_FILTER,
  matchesDigivolutionCostFilter,
} from "@/screens/matchesDigivolutionCostFilter";

const twoAndFour = [{ memoryCost: 2 }, { memoryCost: 4 }];

describe("digivolution cost filter", () => {
  it("matches every card when no digivolution cost is selected", () => {
    expect(matchesDigivolutionCostFilter({ evoCosts: [], selectedCosts: [] })).toBe(true);
    expect(matchesDigivolutionCostFilter({ evoCosts: twoAndFour, selectedCosts: [] })).toBe(true);
  });

  it("matches when any of the card's digivolution costs is selected", () => {
    expect(matchesDigivolutionCostFilter({ evoCosts: twoAndFour, selectedCosts: [4] })).toBe(true);
    expect(matchesDigivolutionCostFilter({ evoCosts: twoAndFour, selectedCosts: [1, 2] })).toBe(true);
    expect(matchesDigivolutionCostFilter({ evoCosts: twoAndFour, selectedCosts: [3] })).toBe(false);
  });

  it("matches zero as an exact digivolution cost", () => {
    expect(matchesDigivolutionCostFilter({ evoCosts: [{ memoryCost: 0 }], selectedCosts: [0] })).toBe(true);
    expect(matchesDigivolutionCostFilter({ evoCosts: [{ memoryCost: 1 }], selectedCosts: [0] })).toBe(false);
  });

  it("treats the highest chip as an or-more bucket", () => {
    expect(
      matchesDigivolutionCostFilter({
        evoCosts: [{ memoryCost: 9 }],
        selectedCosts: [HIGHEST_DIGIVOLUTION_COST_FILTER],
      }),
    ).toBe(true);
    expect(
      matchesDigivolutionCostFilter({
        evoCosts: [{ memoryCost: HIGHEST_DIGIVOLUTION_COST_FILTER - 1 }],
        selectedCosts: [HIGHEST_DIGIVOLUTION_COST_FILTER],
      }),
    ).toBe(false);
  });

  it("never matches a card without digivolution costs while the filter is active", () => {
    expect(matchesDigivolutionCostFilter({ evoCosts: [], selectedCosts: [...DIGIVOLUTION_COST_FILTERS] })).toBe(false);
  });

  it("reaches every printed digivolution cost with a chip", () => {
    const unreachable = allCards().filter(
      (card) =>
        card.evoCosts.length > 0 &&
        !matchesDigivolutionCostFilter({ evoCosts: card.evoCosts, selectedCosts: [...DIGIVOLUTION_COST_FILTERS] }),
    );
    expect(unreachable).toEqual([]);
  });
});
