import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fieldBadgesCss = readFileSync(new URL("./fieldBadges.css", import.meta.url), "utf8");
const dpDeltaRule = fieldBadgesCss.match(/\.game-permanent \.game-dp-delta-badge \{[^}]*\}/)?.[0] ?? "";

describe("DP change badge text size", () => {
  it("grows with the player's text size", () => {
    expect(dpDeltaRule).toMatch(/font:\s*700 calc\(var\(--badge-font\) \* var\(--ds-text-scale, 1\)\)/);
  });

  it("rises with the DP number it sits above so the two never overlap", () => {
    expect(dpDeltaRule).toMatch(/bottom:\s*calc\([^;]*var\(--ds-text-scale, 1\)[^;]*\);/);
  });
});
