import type { Seat } from "@aegis/shared";
import type { Decklist } from "../setup.js";
import type { CardSpec } from "./types.js";

/** Preserve a recorded pile order while allowing the runner's staged deck to supply its cards. */
export function dealtCards({
  deck,
  seat,
  indices,
  egg = false,
  aliasOffset = 0,
  faceUp = false,
}: {
  deck: Decklist;
  seat: Seat;
  indices: readonly number[];
  egg?: boolean;
  aliasOffset?: number;
  faceUp?: boolean;
}): CardSpec[] {
  const cards = egg ? deck.eggDeck : deck.mainDeck;
  const arts = egg ? deck.eggDeckArts : deck.mainDeckArts;
  return indices.map((index) => {
    const card = cards[index];
    if (!card) throw new Error(`Missing fixture deck card at ${index}`);
    return {
      card,
      as: `${seat === 0 ? "own" : "opponent"}-deck-slot-${index + aliasOffset}-card`,
      artId: arts?.[index] ?? card,
      faceUp,
      fromDeck: { seat, index, ...(egg ? { egg: true } : {}) },
    };
  });
}
