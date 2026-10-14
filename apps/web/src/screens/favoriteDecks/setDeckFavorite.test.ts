// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFavoriteDeckIds } from "@/screens/favoriteDecks/getFavoriteDeckIds";
import { setDeckFavorite } from "@/screens/favoriteDecks/setDeckFavorite";
import { setFavoriteDeckIds } from "@/screens/favoriteDecks/setFavoriteDeckIds";

beforeEach(() => {
  setFavoriteDeckIds([]);
  localStorage.clear();
});

describe("favorite decks on this device", () => {
  it("adds and removes a favorite and remembers the list in storage", () => {
    setDeckFavorite({ deckId: "custom-1", favorite: true });
    setDeckFavorite({ deckId: "custom-2", favorite: true });
    setDeckFavorite({ deckId: "custom-1", favorite: false });
    expect(getFavoriteDeckIds()).toEqual(["custom-2"]);
    expect(JSON.parse(localStorage.getItem("aegis:favoriteDecks") ?? "null")).toEqual(["custom-2"]);
  });

  it("restores stored favorites and drops malformed or repeated ids", async () => {
    localStorage.setItem("aegis:favoriteDecks", JSON.stringify(["custom-1", 7, "", "custom-1", "x".repeat(65)]));
    vi.resetModules();
    const fresh = await import("@/screens/favoriteDecks/getFavoriteDeckIds");
    expect(fresh.getFavoriteDeckIds()).toEqual(["custom-1"]);
  });

  it("starts empty when the stored value is not a list", async () => {
    localStorage.setItem("aegis:favoriteDecks", "{broken");
    vi.resetModules();
    const fresh = await import("@/screens/favoriteDecks/getFavoriteDeckIds");
    expect(fresh.getFavoriteDeckIds()).toEqual([]);
  });
});
