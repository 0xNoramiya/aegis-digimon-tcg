import type { DeckListing } from "@/game/decks";
import type { FamousDeckListingGroup } from "@/game/famousDecks";

export interface FamousDeckCatalog {
  groups: readonly FamousDeckListingGroup[];
  decks: readonly DeckListing[];
}

export const famousDeckCache: { catalog?: FamousDeckCatalog; pending?: Promise<FamousDeckCatalog> } = {};
