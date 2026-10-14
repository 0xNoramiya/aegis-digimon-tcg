import artsJson from "./data/arts.json" with { type: "json" };
import { cardData } from "./data/index.js";
import type { CardArt } from "./types.js";

type EncodedCardArt = [suffix: string, labelIndex: number, imageId?: string];

interface EncodedCardArts {
  labels: readonly string[];
  cards: Readonly<Record<string, readonly EncodedCardArt[]>>;
}

const encodedArts = artsJson as unknown as EncodedCardArts;
const decodedAlternateArts = new Map<string, readonly CardArt[]>();

function getAlternateArts(cardId: string): readonly CardArt[] {
  const cached = decodedAlternateArts.get(cardId);
  if (cached) {
    return cached;
  }
  const encoded = Object.hasOwn(encodedArts.cards, cardId) ? encodedArts.cards[cardId]! : [];
  const decoded = encoded.map(([suffix, labelIndex, imageId]): CardArt => {
    const artId = `${cardId}${suffix}`;
    return { artId, imageId: imageId ?? artId, label: encodedArts.labels[labelIndex] ?? "" };
  });
  decodedAlternateArts.set(cardId, decoded);
  return decoded;
}

/** Cosmetic printing IDs never become the card's rules identity. */
export function getCardArts(cardId: string): readonly CardArt[] {
  const base: CardArt = {
    artId: cardId,
    imageId: (Object.hasOwn(cardData, cardId) ? cardData[cardId]?.imageId : undefined) ?? cardId,
    label: "Original art",
  };
  return [base, ...getAlternateArts(cardId)];
}

/** Reject foreign/unknown printing IDs and retain compatibility with older decks. */
export function resolveCardArt(cardId: string, artId?: string): CardArt {
  const arts = getCardArts(cardId);
  return arts.find((art) => art.artId === artId) ?? arts[0]!;
}

/** Japanese printings use `-J` art IDs, set by tools/lib/card-arts.mjs. */
export function isJapaneseArt(artId: string): boolean {
  return artId.endsWith("-J");
}
