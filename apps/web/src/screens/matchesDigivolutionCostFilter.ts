import { type EvoCost } from "@aegis/shared/cards/types";
import { matchesCostBucket } from "@/screens/matchesCostBucket";

export const HIGHEST_DIGIVOLUTION_COST_FILTER = 7;

export const DIGIVOLUTION_COST_FILTERS = [0, 1, 2, 3, 4, 5, 6, HIGHEST_DIGIVOLUTION_COST_FILTER] as const;

export type DigivolutionCostFilter = (typeof DIGIVOLUTION_COST_FILTERS)[number];

type MatchesDigivolutionCostFilterParams = {
  evoCosts: readonly Pick<EvoCost, "memoryCost">[];
  selectedCosts: readonly DigivolutionCostFilter[];
};

export function matchesDigivolutionCostFilter({
  evoCosts,
  selectedCosts,
}: MatchesDigivolutionCostFilterParams): boolean {
  if (selectedCosts.length === 0) {
    return true;
  }
  return evoCosts.some(({ memoryCost }) =>
    selectedCosts.some((bucket) =>
      matchesCostBucket({ cost: memoryCost, bucket, highestBucket: HIGHEST_DIGIVOLUTION_COST_FILTER }),
    ),
  );
}
