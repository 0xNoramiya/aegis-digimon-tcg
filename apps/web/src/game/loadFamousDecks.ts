import { loadCardData } from "@/cardData/loadCardData";
import { famousDeckCache, type FamousDeckCatalog } from "@/game/famousDeckCache";

export function loadFamousDecks(): Promise<FamousDeckCatalog> {
  famousDeckCache.pending ??= loadCardData()
    .then(() => import("@/game/famousDecks"))
    .then((module) => {
      famousDeckCache.catalog = { groups: module.FAMOUS_DECK_GROUPS, decks: module.FAMOUS_DECKS };
      return famousDeckCache.catalog;
    })
    .catch((error: unknown) => {
      famousDeckCache.pending = undefined;
      throw error;
    });
  return famousDeckCache.pending;
}
