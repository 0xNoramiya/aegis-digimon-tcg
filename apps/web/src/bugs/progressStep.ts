import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { type FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { FEEDBACK_PROGRESS_CLOSED, type FeedbackProgressStep } from "@/bugs/feedbackStatus";

export function progressStep(status: FeedbackStatus): FeedbackProgressStep {
  return isClosedFeedbackStatus(status) ? FEEDBACK_PROGRESS_CLOSED : status;
}
