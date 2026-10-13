import type { CardDefinition } from "@aegis/shared";
import { cardData, cardList } from "@/cardData/cardDataStore";

let pending: Promise<void> | undefined;

export function loadCardData(): Promise<void> {
  pending ??= import("@aegis/shared/cards/data/cards.json")
    .then((module) => {
      const cards = module.default as unknown as CardDefinition[];
      if (cardList.length === 0) {
        cardList.push(...cards);
        for (const card of cards) {
          cardData[card.cardId] = card;
        }
      }
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
