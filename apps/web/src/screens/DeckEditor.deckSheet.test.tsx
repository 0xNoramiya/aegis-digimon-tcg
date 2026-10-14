// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { createBlankDeck, type DeckListing } from "@/game/decks";
import { DeckEditor } from "@/screens/DeckEditor";

afterEach(() => cleanup());

const deck: DeckListing = {
  ...createBlankDeck([], "Red", "Sheet deck"),
  mainDeck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-084", "BT1-085", "BT1-085", "BT1-090"],
  eggDeck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
};

function renderEditor() {
  render(
    <I18nProvider>
      <DeckEditor deck={deck} onSave={() => undefined} onClose={() => undefined} onNav={() => undefined} />
    </I18nProvider>,
  );
}

describe("deck sheet bar", () => {
  it("shows the main and Digi-Egg counts and opens the deck sheet with its stats", () => {
    renderEditor();
    const bar = screen.getByRole("button", { name: /^View deck/ });
    expect(bar).toHaveProperty("textContent", expect.stringContaining("Main 8/50"));
    expect(bar).toHaveProperty("textContent", expect.stringContaining("Egg 5/5"));
    expect(bar.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(bar);

    expect(bar.getAttribute("aria-expanded")).toBe("true");
    const sheet = screen.getByRole("complementary", { name: "Deck information" });
    expect(sheet.className).toContain("deck-current--open");
    expect(within(sheet).getByText("Cost curve")).toBeTruthy();
    const typeCounts = Object.fromEntries(
      within(sheet)
        .getAllByRole("term")
        .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
    );
    expect(typeCounts).toEqual({ Digimon: "5", Tamer: "2", Option: "1", "Digi-Egg": "5" });
  });

  it("keeps add and remove working from the open sheet", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^View deck/ }));
    const sheet = screen.getByRole("complementary", { name: "Deck information" });

    fireEvent.click(within(sheet).getByRole("button", { name: "Remove Tai Kamiya" }));

    expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 7/50");
    fireEvent.click(within(sheet).getByRole("button", { name: "Add Tai Kamiya" }));
    expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 8/50");
  });
});
