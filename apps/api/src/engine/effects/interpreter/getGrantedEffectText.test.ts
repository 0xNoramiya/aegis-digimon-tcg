import { describe, expect, it } from "vitest";
import { getGrantedEffectText } from "#api/engine/effects/interpreter/getGrantedEffectText";
import { GRANTED_EFFECT_LIBRARY } from "#api/engine/effects/interpreter/grantedEffects";

describe("getGrantedEffectText", () => {
  it("returns the printed clause for a compiler-generated forced attack token", () => {
    expect(getGrantedEffectText("GRANTEFFECT23TOKEN")).toBe("[Start of Your Main Phase] This Digimon attacks.");
  });

  it("returns the printed clause for a compiler-generated end-of-turn deletion token", () => {
    expect(getGrantedEffectText("GRANTEFFECT51TOKEN")).toBe("[End of Your Turn] Delete this Digimon.");
  });

  it("keeps a literal printed token as written", () => {
    expect(getGrantedEffectText("[Start of Your Main Phase] Attack with this Digimon.")).toBe(
      "[Start of Your Main Phase] Attack with this Digimon.",
    );
  });

  it("never exposes a compiler-generated token as player text", () => {
    const generatedTokens = Object.keys(GRANTED_EFFECT_LIBRARY).filter((token) => /^GRANTEFFECT\d+TOKEN$/.test(token));
    expect(generatedTokens.length).toBeGreaterThan(0);
    for (const token of generatedTokens) expect(getGrantedEffectText(token)).not.toMatch(/GRANTEFFECT\d+TOKEN/);
  });
});
