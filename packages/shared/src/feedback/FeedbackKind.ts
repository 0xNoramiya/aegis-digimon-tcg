export const FeedbackKind = {
  BUG: { name: "BUG", value: "bug" },
  IMPROVEMENT: { name: "IMPROVEMENT", value: "improvement" },
  OTHER: { name: "OTHER", value: "other" },
} as const;
export type FeedbackKind = (typeof FeedbackKind)[keyof typeof FeedbackKind]["value"];
export const FEEDBACK_KINDS = Object.values(FeedbackKind).map((entry) => entry.value);
