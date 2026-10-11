import { MAX_FEEDBACK_REOPEN_COMMENT } from "@aegis/shared/feedback/limits";
import { type FeedbackReopenFailure } from "@aegis/shared/feedback/types";

export function validateReopenComment(raw: unknown): string | { error: FeedbackReopenFailure } {
  const comment = typeof raw === "string" ? raw.trim() : "";
  if (!comment) return { error: "empty_comment" };
  if (comment.length > MAX_FEEDBACK_REOPEN_COMMENT) return { error: "comment_too_long" };
  return comment;
}
