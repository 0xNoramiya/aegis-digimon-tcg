import { FEEDBACK_KINDS, type FeedbackKind } from "#shared/feedback/types";

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === "string" && FEEDBACK_KINDS.some((kind) => kind === value);
}
