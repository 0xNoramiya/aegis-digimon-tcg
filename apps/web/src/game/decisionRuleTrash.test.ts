import { describe, expect, it } from "vitest";
import { decisionVisibleCards, type CandidateZone } from "./decisionModel";

describe("Feedback #44 paid future-trash material presentation", () => {
  it("shows only the authoritative paid sources as trash while preserving unrelated stored-card zones", () => {
    const identities = new Map([
      ["paid-source", "BT10-008"],
      ["stored-card", "BT10-012"],
      ["hand-card", "BT10-013"],
    ]);
    const zones = new Map<string, CandidateZone>([
      ["paid-source", "digivolutionCards"],
      ["stored-card", "digivolutionCards"],
      ["hand-card", "hand"],
    ]);
    const cards = decisionVisibleCards(
      {
        candidateInstanceIds: [...identities.keys()],
        digiXrosCardId: "BT12-112",
        digiXrosRuleTrashInstanceIds: ["paid-source"],
      },
      identities,
      undefined,
      zones,
    );
    expect(cards).toEqual([
      { instanceId: "paid-source", cardId: "BT10-008", zone: "trash" },
      { instanceId: "stored-card", cardId: "BT10-012", zone: "digivolutionCards" },
      { instanceId: "hand-card", cardId: "BT10-013", zone: "hand" },
    ]);
    const ordinary = decisionVisibleCards({ candidateInstanceIds: ["paid-source"] }, identities, undefined, zones);
    expect(ordinary[0]!.zone).toBe("digivolutionCards");
  });
});
