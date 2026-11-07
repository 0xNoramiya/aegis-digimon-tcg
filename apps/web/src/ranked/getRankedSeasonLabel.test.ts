import { describe, expect, it } from "vitest";
import { getRankedSeasonLabel } from "@/ranked/getRankedSeasonLabel";
import type { Translate } from "@/i18n/translationTypes";

const t = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key) as Translate;

describe("getRankedSeasonLabel", () => {
  it("labels the first ranked season as the beta season", () => {
    expect(getRankedSeasonLabel({ seasonId: 1, t })).toBe("ranked.season.beta");
  });

  it("numbers the seasons after beta starting from one", () => {
    expect(getRankedSeasonLabel({ seasonId: 2, t })).toBe('ranked.season.number:{"number":1}');
    expect(getRankedSeasonLabel({ seasonId: 5, t })).toBe('ranked.season.number:{"number":4}');
  });
});
