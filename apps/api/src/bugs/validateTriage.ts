import { FeedbackStatus } from "@aegis/shared/feedback/FeedbackStatus";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { isFeedbackStatus } from "@aegis/shared/feedback/isFeedbackStatus";
import { MAX_FEEDBACK_FINAL_REPLY, MAX_FEEDBACK_INTERNAL_NOTE } from "@aegis/shared/feedback/limits";
import { type FeedbackTriageFailure, type FeedbackTriageUpdate } from "@aegis/shared/feedback/types";
import { parseId } from "#api/http/parseId";

type TriageBody = {
  revision?: unknown;
  status?: unknown;
  finalReply?: unknown;
  internalNote?: unknown;
  duplicateOfId?: unknown;
  confirmedBug?: unknown;
};

export function validateTriage(body: unknown): FeedbackTriageUpdate | { error: FeedbackTriageFailure } {
  const input = (body ?? {}) as TriageBody;
  if (!isFeedbackStatus(input.status)) return { error: "invalid_status" };
  const revision = input.revision;
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 0) {
    return { error: "invalid_revision" };
  }
  const finalReply = typeof input.finalReply === "string" ? input.finalReply.trim() : "";
  if (finalReply.length > MAX_FEEDBACK_FINAL_REPLY) return { error: "final_reply_too_long" };
  if (isClosedFeedbackStatus(input.status) && !finalReply) return { error: "final_reply_required" };
  const internalNote = typeof input.internalNote === "string" ? input.internalNote.trim() : "";
  if (internalNote.length > MAX_FEEDBACK_INTERNAL_NOTE) return { error: "internal_note_too_long" };

  let duplicateOfId: number | null = null;
  if (input.status === FeedbackStatus.DUPLICATE.value) {
    if (input.duplicateOfId === undefined || input.duplicateOfId === null)
      return { error: "duplicate_target_required" };
    duplicateOfId = parseId(input.duplicateOfId) ?? null;
    if (duplicateOfId === null) return { error: "invalid_duplicate_target" };
  }
  return {
    revision,
    status: input.status,
    finalReply,
    internalNote,
    duplicateOfId,
    ...(typeof input.confirmedBug === "boolean" ? { confirmedBug: input.confirmedBug } : {}),
  };
}
