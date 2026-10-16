type Params = {
  counts: readonly (readonly [string, number])[];
  placed: readonly string[];
  opening?: readonly string[];
};

export function buildStoryDrawPile({ counts, placed, opening = [] }: Params): string[] {
  const cards = counts.flatMap(([card, count]) => Array.from({ length: count }, () => card));
  for (const card of [...placed, ...opening]) {
    const index = cards.indexOf(card);
    if (index < 0) {
      throw new Error(`Missing card in story deck: ${card}`);
    }
    cards.splice(index, 1);
  }
  return [...opening, ...cards];
}
