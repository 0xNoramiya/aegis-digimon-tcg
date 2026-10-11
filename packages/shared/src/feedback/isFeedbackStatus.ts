import { FEEDBACK_STATUSES, type FeedbackStatus } from "#shared/feedback/FeedbackStatus";

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return typeof value === "string" && FEEDBACK_STATUSES.some((status) => status === value);
}
