import type { DeckListing } from "@/game/decks";

type SelectableDecksParams = {
  personalDecks: readonly DeckListing[];
  famousDecks: readonly DeckListing[];
};

/** Personal decks followed by the immutable presets available for selection. */
export function selectableDecks({ personalDecks, famousDecks }: SelectableDecksParams): DeckListing[] {
  return [...personalDecks, ...famousDecks];
}
