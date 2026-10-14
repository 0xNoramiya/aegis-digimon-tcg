type Params = {
  first: readonly string[];
  second: readonly string[];
};

export function isSameDeckIdList({ first, second }: Params): boolean {
  return first.length === second.length && first.every((deckId, index) => deckId === second[index]);
}
