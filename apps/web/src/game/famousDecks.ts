import {
  famousDeckGroups,
  formatCopyLimit,
  getCardDefinition,
  isDeckFormat,
  type DeckFormat,
  type FamousDeck,
} from "@aegis/shared";
import type { DeckListing } from "@/game/decks";
import { colorKey, type ColorName } from "@/design/theme";

export interface FamousDeckListingGroup {
  collection: string;
  decks: readonly DeckListing[];
}

function exceedsStandardCopyLimits(cards: readonly string[]): boolean {
  const counts = new Map<string, number>();
  for (const cardId of cards) counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  return [...counts].some(([cardId, count]) => count > formatCopyLimit(cardId, "standard"));
}

/** A preset that later restrictions made illegal stays playable under its anchor set's historical rules. */
function famousDeckFormat(deck: FamousDeck): DeckFormat | undefined {
  const cards = [...deck.decklist.mainDeck, ...deck.decklist.eggDeck];
  if (!exceedsStandardCopyLimits(cards) || !isDeckFormat(deck.anchorProduct)) return undefined;
  return deck.anchorProduct;
}

function famousDeckListing(deck: FamousDeck): DeckListing {
  const format = famousDeckFormat(deck);
  const coverCardId = [...deck.decklist.mainDeck]
    .reverse()
    .find((cardId) => getCardDefinition(cardId)?.level !== undefined);
  return {
    id: deck.deckId,
    name: deck.archetype,
    color: colorKey(deck.colors[0]) as ColorName,
    blurb: `${deck.archetype} · ${deck.block}`,
    mainDeck: [...deck.decklist.mainDeck],
    eggDeck: [...deck.decklist.eggDeck],
    coverCardId,
    ...(format ? { format } : {}),
  };
}

/** Immutable presets available under the operational card-pool cutoff. */
export const FAMOUS_DECK_GROUPS: readonly FamousDeckListingGroup[] = Object.freeze(
  famousDeckGroups().map((group) =>
    Object.freeze({ collection: group.collection, decks: Object.freeze(group.decks.map(famousDeckListing)) }),
  ),
);

export const FAMOUS_DECKS: readonly DeckListing[] = Object.freeze(FAMOUS_DECK_GROUPS.flatMap((group) => group.decks));
