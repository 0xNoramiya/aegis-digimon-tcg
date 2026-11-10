type Params = { accountId: string; deckIds: Iterable<string> };

export function setSyncedDeckIds({ accountId, deckIds }: Params): void {
  try {
    localStorage.setItem(`aegis:synced-decks:${accountId}`, JSON.stringify([...new Set(deckIds)]));
  } catch {
    return;
  }
}
