import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeckPicker } from "@/screens/DeckPicker";
import { I18nProvider } from "@/i18n/I18nProvider";
import { providerApi } from "@/deckProviders/providerApi";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("replaces built-in famous lists with lazy provider lists inside each collection", async () => {
  vi.spyOn(providerApi, "meta").mockResolvedValue({
    data: [{ id: 1, name: "Examon", slug: "examon", colors: ["Blue"], share: 12, winRate: 54, pilots: 10 }],
    formats: [
      { id: "EX13", name: "Chivalrous XIII" },
      { id: "BT26", name: "Timeless Bonds" },
    ],
    page: 1,
    pages: 1,
  });
  const lists = vi.spyOn(providerApi, "lists").mockImplementation(async (query) => ({
    data: [
      {
        id: query.get("format") === "EX13" ? 1 : 2,
        name: `${query.get("format")} tournament winner`,
        colors: [],
        format: query.get("format"),
        player: "Tamer",
        date: null,
        event: null,
        placement: 1,
        wins: null,
        losses: null,
        ties: null,
        sourceUrl: "https://digimon.digilab.cards/decklist/1",
      },
    ],
    formats: [],
    page: 1,
    pages: 1,
  }));
  render(
    <I18nProvider>
      <DeckPicker
        ownDecks={[]}
        activeDeckId=""
        randomSelected={false}
        randomPoolSize={0}
        onSelectRandom={vi.fn()}
        onSelectDeck={vi.fn()}
        onCopyDeck={vi.fn()}
        onUseProviderDeck={vi.fn()}
        onEditDeck={vi.fn()}
        onBuildDeck={vi.fn()}
        onPickCommunityDeck={vi.fn()}
        onOpenCommunityDeck={vi.fn()}
        accountId={undefined}
      />
    </I18nProvider>,
  );
  await screen.findByRole("button", { name: "Examon" });
  expect(lists).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Omnimon" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Recent versions · Examon" }));
  await screen.findByRole("button", { name: "EX13 tournament winner" });
  expect(lists.mock.calls[0]![0].get("format")).toBe("EX13");
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.click(screen.getByRole("heading", { name: "BT26" }));
  const secondCollection = within(screen.getByRole("region", { name: "BT26" }));
  fireEvent.click(await secondCollection.findByRole("button", { name: "Recent versions · Examon" }));
  await screen.findByRole("button", { name: "BT26 tournament winner" });
  expect(lists.mock.calls[1]![0].get("format")).toBe("BT26");
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  const collectionSelect = document.querySelector(".deck-picker__collection-filter select")!;
  fireEvent.change(collectionSelect, { target: { value: "BT26" } });
  await waitFor(() => expect(screen.queryByRole("region", { name: "EX13" })).toBeNull());
  expect(screen.getByRole("button", { name: "Examon" })).toBeTruthy();
});
