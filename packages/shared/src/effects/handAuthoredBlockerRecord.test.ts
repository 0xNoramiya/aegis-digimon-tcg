import { describe, expect, it } from "vitest";
import { getCompiledCard } from "./data.js";

describe("hand-authored Blocker record", () => {
  it("keeps ST15-13 fully covered without unparsed actions", () => {
    const compiled = getCompiledCard("ST15-13");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const actionKinds = compiled?.effects.flatMap((effect) => effect.actions?.map((action) => action.kind) ?? []);
    expect(actionKinds).not.toContain("RawUnparsed");
  });
});
