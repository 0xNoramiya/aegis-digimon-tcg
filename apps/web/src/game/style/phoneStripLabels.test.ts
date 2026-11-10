import { describe, expect, it } from "vitest";
import { mediaRules, readRelative } from "./stylesheetSource";

const phoneRules = mediaRules(readRelative("fieldLayout.css"), "(width < 600px) and (orientation: portrait)");

describe("phone pile strip labels", () => {
  it("takes labels out of the strip's height and centers each pile in it", () => {
    expect(phoneRules).toMatch(/\.game-utility-slot \{[^}]*align-self:\s*stretch;[^}]*justify-content:\s*center/);
    expect(phoneRules).toMatch(/\.game-security-shield__label\s*\) \{[^}]*position:\s*absolute;[^}]*grid-area:\s*auto/);
  });

  it("puts each label on the strip border that faces the battle area", () => {
    expect(phoneRules).toMatch(
      /\.game-security-shield--opp \.game-security-shield__label\s*\) \{\s*top:\s*auto;\s*bottom:\s*-5px/,
    );
    expect(phoneRules).toMatch(
      /\.game-security-shield--you \.game-security-shield__label\s*\) \{\s*top:\s*-5px;\s*bottom:\s*auto/,
    );
  });
});
