import { describe, expect, it } from "vitest";
import { printedPassage } from "#api/engine/decisions/printedPassage";

describe("printedPassage", () => {
  const printed =
    "[On Play] You may return 1 card with [Omnimon] in its name. If this effect didn't return, ＜Draw 1＞";

  it("returns the printed spelling of a passage that differs only in whitespace and case", () => {
    expect(printedPassage(printed, "you may return 1 card with [Omnimon] in its name.")).toBe(
      "You may return 1 card with [Omnimon] in its name.",
    );
  });

  it("treats bracketed names and punctuation literally", () => {
    expect(printedPassage(printed, "with [Omnimon]. in")).toBeUndefined();
    expect(printedPassage(printed, "＜Draw 1＞")).toBe("＜Draw 1＞");
  });

  it("finds nothing for a blank or absent passage", () => {
    expect(printedPassage(printed, "  ")).toBeUndefined();
    expect(printedPassage(printed, "trash 1 card")).toBeUndefined();
  });
});
