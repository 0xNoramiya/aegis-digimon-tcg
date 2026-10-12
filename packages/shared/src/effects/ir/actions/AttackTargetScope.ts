export const AttackTargetScope = {
  ANY: { name: "ANY", value: "any" },
  PLAYER: { name: "PLAYER", value: "player" },
  DIGIMON: { name: "DIGIMON", value: "digimon" },
} as const;

export type AttackTargetScope = (typeof AttackTargetScope)[keyof typeof AttackTargetScope]["value"];
