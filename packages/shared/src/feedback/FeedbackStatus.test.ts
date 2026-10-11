import { describe, expect, it } from "vitest";
import { CLOSED_FEEDBACK_STATUSES, FEEDBACK_STATUSES, FeedbackStatus } from "#shared/feedback/FeedbackStatus";
import { isClosedFeedbackStatus } from "#shared/feedback/isClosedFeedbackStatus";
import { isFeedbackStatus } from "#shared/feedback/isFeedbackStatus";

describe("feedback status compatibility", () => {
  it("preserves the persisted lifecycle values and their display order", () => {
    expect(FEEDBACK_STATUSES).toEqual(["new", "triaged", "in_progress", "resolved", "wont_fix", "duplicate"]);
    expect(CLOSED_FEEDBACK_STATUSES).toEqual(["resolved", "wont_fix", "duplicate"]);
  });

  it.each(["new", "triaged", "in_progress", "resolved", "wont_fix", "duplicate"])(
    "accepts the existing serialized value %s",
    (value) => {
      expect(isFeedbackStatus(value)).toBe(true);
    },
  );

  it.each([null, undefined, 0, true, {}, [], "NEW", "closed", "constructor", "__proto__", ""])(
    "rejects an invalid boundary value %j",
    (value) => {
      expect(isFeedbackStatus(value)).toBe(false);
    },
  );

  it("rejects objects that coerce to a valid persisted value", () => {
    expect(isFeedbackStatus({ toString: () => "new" })).toBe(false);
  });

  it.each([
    [FeedbackStatus.NEW.value, false],
    [FeedbackStatus.TRIAGED.value, false],
    [FeedbackStatus.IN_PROGRESS.value, false],
    [FeedbackStatus.RESOLVED.value, true],
    [FeedbackStatus.WONT_FIX.value, true],
    [FeedbackStatus.DUPLICATE.value, true],
  ] as const)("classifies %s for the reply and reopening lifecycle", (status, closed) => {
    expect(isClosedFeedbackStatus(status)).toBe(closed);
  });
});
