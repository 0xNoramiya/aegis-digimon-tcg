import { describe, expect, it } from "vitest";
import { placeFavoriteDecksFirst } from "@/screens/favoriteDecks/placeFavoriteDecksFirst";

const decks = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

describe("placeFavoriteDecksFirst", () => {
  it("moves favorite decks to the top and keeps both groups in their given order", () => {
    const ordered = placeFavoriteDecksFirst({ decks, favoriteDeckIds: ["d", "b"] });
    expect(ordered.map((deck) => deck.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("ignores favorite ids that match no listed deck", () => {
    const ordered = placeFavoriteDecksFirst({ decks, favoriteDeckIds: ["missing"] });
    expect(ordered.map((deck) => deck.id)).toEqual(["a", "b", "c", "d"]);
  });
});
