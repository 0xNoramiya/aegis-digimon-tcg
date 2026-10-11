import {
  CLOSED_FEEDBACK_STATUSES,
  type ClosedFeedbackStatus,
  type FeedbackStatus,
} from "#shared/feedback/FeedbackStatus";

export function isClosedFeedbackStatus(status: FeedbackStatus): status is ClosedFeedbackStatus {
  return CLOSED_FEEDBACK_STATUSES.some((value) => value === status);
}
