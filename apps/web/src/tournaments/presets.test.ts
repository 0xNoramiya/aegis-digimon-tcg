import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET_ID, findPresetOption, TOURNAMENT_PRESETS } from "./presets";

describe("tournament preset options", () => {
  it("defaults the creation form to the community preset", () => {
    expect(DEFAULT_PRESET_ID).toBe("aegis_community");
    expect(findPresetOption(DEFAULT_PRESET_ID)).toBeDefined();
  });

  it("lets the community preset run a best-of-one single-elimination event with bots", () => {
    expect(findPresetOption("aegis_community")).toMatchObject({
      structures: ["swiss", "single_elimination"],
      bestOfOptions: [1, 3],
      supportsTopCut: true,
      supportsBots: true,
      supportsUnrestrictedBanlist: true,
    });
  });

  it("no longer offers the retired lightning cup", () => {
    expect(TOURNAMENT_PRESETS.map((preset) => preset.id)).toEqual(["aegis_community", "bandai_general"]);
    expect(findPresetOption("aegis_lightning")).toBeUndefined();
  });
});
