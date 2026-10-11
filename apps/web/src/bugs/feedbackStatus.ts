import { FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import type { BadgeTone } from "@/design/primitives";

export const FEEDBACK_STATUS_TONE: Record<FeedbackStatus, BadgeTone> = {
  [FeedbackStatus.NEW.value]: "neutral",
  [FeedbackStatus.TRIAGED.value]: "warning",
  [FeedbackStatus.IN_PROGRESS.value]: "warning",
  [FeedbackStatus.RESOLVED.value]: "success",
  [FeedbackStatus.WONT_FIX.value]: "danger",
  [FeedbackStatus.DUPLICATE.value]: "neutral",
};

export const FEEDBACK_PROGRESS_CLOSED = "closed";
export const FEEDBACK_PROGRESS_STEPS = [
  FeedbackStatus.NEW.value,
  FeedbackStatus.TRIAGED.value,
  FeedbackStatus.IN_PROGRESS.value,
  FEEDBACK_PROGRESS_CLOSED,
] as const;
export type FeedbackProgressStep = (typeof FEEDBACK_PROGRESS_STEPS)[number];
