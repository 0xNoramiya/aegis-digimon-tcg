export const TrophySourceKind = {
  TOURNAMENT: { name: "TOURNAMENT", value: "tournament" },
} as const;

export type TrophySourceKind = (typeof TrophySourceKind)[keyof typeof TrophySourceKind]["value"];
