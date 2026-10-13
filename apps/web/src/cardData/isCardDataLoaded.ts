import { cardList } from "@/cardData/cardDataStore";

export function isCardDataLoaded(): boolean {
  return cardList.length > 0;
}
