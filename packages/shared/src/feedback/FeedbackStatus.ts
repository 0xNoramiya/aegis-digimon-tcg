export const FeedbackStatus = {
  NEW: { name: "NEW", value: "new", isClosed: false },
  TRIAGED: { name: "TRIAGED", value: "triaged", isClosed: false },
  IN_PROGRESS: { name: "IN_PROGRESS", value: "in_progress", isClosed: false },
  RESOLVED: { name: "RESOLVED", value: "resolved", isClosed: true },
  WONT_FIX: { name: "WONT_FIX", value: "wont_fix", isClosed: true },
  DUPLICATE: { name: "DUPLICATE", value: "duplicate", isClosed: true },
} as const;

type FeedbackStatusEntry = (typeof FeedbackStatus)[keyof typeof FeedbackStatus];
type ClosedFeedbackStatusEntry = Extract<FeedbackStatusEntry, { readonly isClosed: true }>;

export type FeedbackStatus = FeedbackStatusEntry["value"];
export type ClosedFeedbackStatus = ClosedFeedbackStatusEntry["value"];

export const FEEDBACK_STATUSES: readonly FeedbackStatus[] = Object.values(FeedbackStatus).map(({ value }) => value);
export const CLOSED_FEEDBACK_STATUSES: readonly ClosedFeedbackStatus[] = Object.values(FeedbackStatus)
  .filter((entry): entry is ClosedFeedbackStatusEntry => entry.isClosed)
  .map(({ value }) => value);
