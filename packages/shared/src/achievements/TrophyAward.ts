import { TrophySourceKind } from "#shared/achievements/TrophySourceKind";
import { TrophyTier } from "#shared/achievements/TrophyTier";

export const TrophyAward = {
  TOURNAMENT_CHAMPION: {
    name: "TOURNAMENT_CHAMPION",
    value: "tournament_champion",
    sourceKind: TrophySourceKind.TOURNAMENT.value,
    tournamentPlacement: "champion",
    tier: TrophyTier.GOLD.value,
  },
  TOURNAMENT_TOP_FOUR: {
    name: "TOURNAMENT_TOP_FOUR",
    value: "tournament_top_four",
    sourceKind: TrophySourceKind.TOURNAMENT.value,
    tournamentPlacement: "top_four",
    tier: TrophyTier.SILVER.value,
  },
  TOURNAMENT_TOP_EIGHT: {
    name: "TOURNAMENT_TOP_EIGHT",
    value: "tournament_top_eight",
    sourceKind: TrophySourceKind.TOURNAMENT.value,
    tournamentPlacement: "top_eight",
    tier: TrophyTier.BRONZE.value,
  },
} as const;

export type TrophyAward = (typeof TrophyAward)[keyof typeof TrophyAward]["value"];
