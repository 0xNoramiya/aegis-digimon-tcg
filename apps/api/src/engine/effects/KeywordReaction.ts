export const KeywordReaction = {
  BARRIER: { name: "BARRIER", value: "keyword-barrier", precedesCardReactions: true },
  PARTITION: { name: "PARTITION", value: "keyword-partition", precedesCardReactions: false },
  DETACH: { name: "DETACH", value: "keyword-detach", precedesCardReactions: false },
  GUARD: { name: "GUARD", value: "keyword-guard", precedesCardReactions: false },
  ARMOR_PURGE: { name: "ARMOR_PURGE", value: "keyword-armor-purge", precedesCardReactions: false },
  EVADE: { name: "EVADE", value: "keyword-evade", precedesCardReactions: false },
  FRAGMENT: { name: "FRAGMENT", value: "keyword-fragment", precedesCardReactions: false },
  SCAPEGOAT: { name: "SCAPEGOAT", value: "keyword-scapegoat", precedesCardReactions: false },
  DECOY: { name: "DECOY", value: "keyword-decoy", precedesCardReactions: false },
} as const;

export type KeywordReaction = (typeof KeywordReaction)[keyof typeof KeywordReaction]["value"];

export type KeywordReactionId = `${KeywordReaction}/${string}`;
