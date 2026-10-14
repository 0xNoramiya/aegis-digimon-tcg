import { getCardDefinition } from "@aegis/shared";
import type { CountMap } from "@/screens/deckCounts";

export const HIGHEST_COST_BUCKET = 10;

export interface DeckCostBucket {
  cost: number;
  includesHigher: boolean;
  count: number;
}

interface CountDeckCostCurveParams {
  main: CountMap;
}

export function countDeckCostCurve({ main }: CountDeckCostCurveParams): DeckCostBucket[] {
  const buckets: DeckCostBucket[] = Array.from({ length: HIGHEST_COST_BUCKET + 1 }, (_, cost) => ({
    cost,
    includesHigher: cost === HIGHEST_COST_BUCKET,
    count: 0,
  }));
  for (const [cardId, count] of Object.entries(main)) {
    const playCost = getCardDefinition(cardId)?.playCost ?? -1;
    if (playCost < 0) {
      continue;
    }
    buckets[Math.min(playCost, HIGHEST_COST_BUCKET)]!.count += count;
  }
  return buckets;
}
