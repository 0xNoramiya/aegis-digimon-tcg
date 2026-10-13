import { useSyncExternalStore } from "react";
import { favoriteDeckStore } from "@/screens/favoriteDecks/favoriteDeckStore";
import { getFavoriteDeckIds } from "@/screens/favoriteDecks/getFavoriteDeckIds";

const NO_FAVORITE_DECKS: readonly string[] = [];

function subscribeFavoriteDeckIds(listener: () => void): () => void {
  favoriteDeckStore.listeners.add(listener);
  return () => favoriteDeckStore.listeners.delete(listener);
}

export function useFavoriteDeckIds(): readonly string[] {
  return useSyncExternalStore(subscribeFavoriteDeckIds, getFavoriteDeckIds, () => NO_FAVORITE_DECKS);
}
