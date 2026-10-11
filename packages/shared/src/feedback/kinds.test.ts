import { describe, expect, it } from "vitest";
import { FEEDBACK_KINDS, isFeedbackKind } from "./index.js";

describe("feedback kinds", () => {
  it("names the three kinds the API accepts", () => {
    expect(FEEDBACK_KINDS).toEqual(["bug", "improvement", "other"]);
  });
  it("recognises a kind and nothing else", () => {
    expect(isFeedbackKind("bug")).toBe(true);
    expect(isFeedbackKind("other")).toBe(true);
    expect(isFeedbackKind("BUG")).toBe(false);
    expect(isFeedbackKind(undefined)).toBe(false);
  });
});
