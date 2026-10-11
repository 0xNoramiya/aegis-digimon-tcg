import { expect, it } from "vitest";
import { decisionVisibleCards, type CandidateZone } from "./decisionModel";

it("only decorates offered, visible, readable trash candidates from server metadata", () => {
  const identities = new Map([
    ["new", "EX7-071"],
    ["old", "EX7-071"],
    ["hidden", "EX7-071"],
    ["hand", "EX7-071"],
    ["disabled", "EX7-071"],
    ["opponent", "EX7-071"],
  ]);
  const zones = new Map<string, CandidateZone>([
    ["new", "trash"],
    ["old", "trash"],
    ["hidden", "trash"],
    ["hand", "hand"],
    ["disabled", "trash"],
    ["opponent", "opponentTrash"],
  ]);
  const candidates = decisionVisibleCards(
    {
      candidateInstanceIds: ["new", "old", "hidden", "hand", "unknown", "opponent"],
      visibleInstanceIds: ["new", "old", "hand", "unknown", "disabled", "opponent"],
      pendingEffectInstanceIds: ["new", "hidden", "hand", "unknown", "disabled", "opponent"],
    },
    identities,
    undefined,
    zones,
  );
  expect(candidates.filter((c) => c.pendingEffect).map((c) => c.instanceId)).toEqual(["new", "opponent"]);
  expect(candidates.find((c) => c.instanceId === "hidden")?.cardId).toBeUndefined();
});
