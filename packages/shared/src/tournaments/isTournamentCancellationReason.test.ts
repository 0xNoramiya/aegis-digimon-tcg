import { describe, expect, it } from "vitest";
import { isTournamentCancellationReason } from "#shared/tournaments/isTournamentCancellationReason";
import { TournamentCancellationReason } from "#shared/tournaments/TournamentCancellationReason";

describe("recognizing why a tournament was cancelled", () => {
  it("accepts every published reason", () => {
    for (const reason of Object.values(TournamentCancellationReason)) {
      expect(isTournamentCancellationReason(reason.value)).toBe(true);
    }
  });

  it("refuses unknown codes, object keys, and non-strings", () => {
    expect(isTournamentCancellationReason("round_closed")).toBe(false);
    expect(isTournamentCancellationReason("constructor")).toBe(false);
    expect(isTournamentCancellationReason(null)).toBe(false);
  });
});
