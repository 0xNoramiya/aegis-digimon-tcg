import { FAVORITE_DECKS_STORAGE_KEY, favoriteDeckStore } from "@/screens/favoriteDecks/favoriteDeckStore";
import { isSameDeckIdList } from "@/screens/favoriteDecks/isSameDeckIdList";
import { sanitizeFavoriteDeckIds } from "@/screens/favoriteDecks/sanitizeFavoriteDeckIds";

export function setFavoriteDeckIds(deckIds: unknown): void {
  const next = sanitizeFavoriteDeckIds(deckIds);
  if (isSameDeckIdList({ first: next, second: favoriteDeckStore.deckIds })) {
    return;
  }
  favoriteDeckStore.deckIds = next;
  try {
    localStorage.setItem(FAVORITE_DECKS_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  for (const listener of favoriteDeckStore.listeners) {
    listener();
  }
}
