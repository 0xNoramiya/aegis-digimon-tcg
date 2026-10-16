export const StoryBattleKind = {
  DEPICTED: { name: "DEPICTED", value: "depicted_card_battle" },
  REPORTED: { name: "REPORTED", value: "reported_card_battle" },
  GROUPED: { name: "GROUPED", value: "grouped_card_battles" },
} as const;

export type StoryBattleKind = (typeof StoryBattleKind)[keyof typeof StoryBattleKind]["value"];
