import { favoriteDeckStore } from "@/screens/favoriteDecks/favoriteDeckStore";

export function getFavoriteDeckIds(): readonly string[] {
  return favoriteDeckStore.deckIds;
}
