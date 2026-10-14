import { getFavoriteDeckIds } from "@/screens/favoriteDecks/getFavoriteDeckIds";
import { setFavoriteDeckIds } from "@/screens/favoriteDecks/setFavoriteDeckIds";

type Params = {
  deckId: string;
  favorite: boolean;
};

export function setDeckFavorite({ deckId, favorite }: Params): void {
  const others = getFavoriteDeckIds().filter((favoriteDeckId) => favoriteDeckId !== deckId);
  setFavoriteDeckIds(favorite ? [...others, deckId] : others);
}
