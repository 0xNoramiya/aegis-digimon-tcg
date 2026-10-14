const MAX_FAVORITE_DECKS = 100;
const MAX_DECK_ID_LENGTH = 64;

export function sanitizeFavoriteDeckIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const deckIds = value.filter(
    (deckId): deckId is string =>
      typeof deckId === "string" && deckId.length > 0 && deckId.length <= MAX_DECK_ID_LENGTH,
  );
  return [...new Set(deckIds)].slice(-MAX_FAVORITE_DECKS);
}
