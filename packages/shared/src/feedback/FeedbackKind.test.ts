import { describe, expect, it } from "vitest";
import { FeedbackKind, FEEDBACK_KINDS } from "#shared/feedback/FeedbackKind";
import { ForumScope, FORUM_SCOPES } from "#shared/feedback/ForumScope";
import { ForumSort, FORUM_SORTS } from "#shared/feedback/ForumSort";

describe("feedback wire values", () => {
  it("preserves the existing report categories", () => {
    expect(FEEDBACK_KINDS).toEqual(["bug", "improvement", "other"]);
    expect(FeedbackKind.IMPROVEMENT.value).toBe("improvement");
  });
  it("derives public forum filters from their definitions", () => {
    expect(FORUM_SCOPES).toEqual(Object.values(ForumScope).map((entry) => entry.value));
    expect(FORUM_SORTS).toEqual(Object.values(ForumSort).map((entry) => entry.value));
    expect(FORUM_SORTS).not.toContain("constructor");
  });
});
