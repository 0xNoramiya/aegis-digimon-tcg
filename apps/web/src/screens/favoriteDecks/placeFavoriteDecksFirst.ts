type Params<Deck extends { id: string }> = {
  decks: readonly Deck[];
  favoriteDeckIds: readonly string[];
};

export function placeFavoriteDecksFirst<Deck extends { id: string }>({ decks, favoriteDeckIds }: Params<Deck>): Deck[] {
  const favorites = new Set(favoriteDeckIds);
  return [...decks.filter((deck) => favorites.has(deck.id)), ...decks.filter((deck) => !favorites.has(deck.id))];
}
