import { sanitizeFavoriteDeckIds } from "@/screens/favoriteDecks/sanitizeFavoriteDeckIds";

export const FAVORITE_DECKS_STORAGE_KEY = "aegis:favoriteDecks";

function readStoredFavoriteDeckIds(): readonly string[] {
  try {
    return sanitizeFavoriteDeckIds(JSON.parse(localStorage.getItem(FAVORITE_DECKS_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export const favoriteDeckStore: { deckIds: readonly string[]; listeners: Set<() => void> } = {
  deckIds: readStoredFavoriteDeckIds(),
  listeners: new Set(),
};
