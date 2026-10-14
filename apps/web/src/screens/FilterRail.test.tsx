// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardColor, CardKind, type CardDefinition } from "@aegis/shared";
import { I18nProvider } from "@/i18n/I18nProvider";
import { FilterRail } from "@/screens/FilterRail";
import { useCardFilter } from "@/screens/cardFilters";

type TestCardParams = {
  cardId: string;
  playCost: number;
  digivolutionCosts: number[];
};

function buildTestCard({ cardId, playCost, digivolutionCosts }: TestCardParams): CardDefinition {
  return {
    cardId,
    set: "BT1",
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Red],
    playCost,
    dp: 5000,
    evoCosts: digivolutionCosts.map((memoryCost) => ({ color: CardColor.Red, level: 3, memoryCost })),
    maxCountInDeck: 4,
  };
}

const cards = [
  buildTestCard({ cardId: "BT1-001", playCost: 12, digivolutionCosts: [3, 5] }),
  buildTestCard({ cardId: "BT1-002", playCost: 7, digivolutionCosts: [9] }),
  buildTestCard({ cardId: "BT1-003", playCost: 20, digivolutionCosts: [] }),
];

function CostFilterHarness() {
  const filter = useCardFilter(cards);
  return (
    <>
      <FilterRail filter={filter} showCostFilter />
      <output data-testid="results">{filter.filtered.map((card) => card.cardId).join(",")}</output>
    </>
  );
}

function getResults(): string {
  return screen.getByTestId("results").textContent ?? "";
}

function renderHarness() {
  render(
    <I18nProvider>
      <CostFilterHarness />
    </I18nProvider>,
  );
  return {
    playCost: within(screen.getByRole("group", { name: "Play cost" })),
    digivolutionCost: within(screen.getByRole("group", { name: "Digivolution cost" })),
  };
}

afterEach(() => cleanup());

describe("deck builder cost filters", () => {
  it("offers exact play costs up to fifteen and a sixteen-or-more chip", () => {
    const { playCost } = renderHarness();

    const labels = playCost.getAllByRole("button").map((chip) => chip.textContent);
    expect(labels).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16+",
    ]);
  });

  it("filters by an exact high play cost and by the or-more bucket", () => {
    const { playCost } = renderHarness();

    fireEvent.click(playCost.getByRole("button", { name: "12" }));
    expect(getResults()).toBe("BT1-001");

    fireEvent.click(playCost.getByRole("button", { name: "16+" }));
    expect(playCost.getByRole("button", { name: "16+" }).getAttribute("aria-pressed")).toBe("true");
    expect(getResults()).toBe("BT1-001,BT1-003");
  });

  it("filters by any digivolution cost and drops cards that cannot digivolve", () => {
    const { digivolutionCost } = renderHarness();

    const labels = digivolutionCost.getAllByRole("button").map((chip) => chip.textContent);
    expect(labels).toEqual(["0", "1", "2", "3", "4", "5", "6", "7+"]);

    fireEvent.click(digivolutionCost.getByRole("button", { name: "5" }));
    expect(getResults()).toBe("BT1-001");

    fireEvent.click(digivolutionCost.getByRole("button", { name: "7+" }));
    expect(getResults()).toBe("BT1-001,BT1-002");
  });

  it("clears both cost filters with the clear filters control", () => {
    const { playCost, digivolutionCost } = renderHarness();

    fireEvent.click(playCost.getByRole("button", { name: "7" }));
    fireEvent.click(digivolutionCost.getByRole("button", { name: "3" }));
    expect(getResults()).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(getResults()).toBe("BT1-001,BT1-002,BT1-003");
    expect(digivolutionCost.getByRole("button", { name: "3" }).getAttribute("aria-pressed")).toBe("false");
  });
});
