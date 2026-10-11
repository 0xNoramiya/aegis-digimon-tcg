import fixtureUlforceXRoyalKnight from "../../api/src/engine/scenarios/ulforce-x-royal-knight.fixture";
import { test, expect } from "./scenario-page";

// EX13-017 Veemon: "Add 1 card with [Veedramon] in its text or the [Royal Knight] trait among
// them to the hand." BT12-029 UlforceVeedramon (X Antibody) prints Holy Warrior/Royal Knight/
// X Antibody, so the picker must offer it beside the other two cards of the production reveal.
test("EX13 Veemon offers and adds UlforceVeedramon (X Antibody)", async ({ scenario }) => {
  await scenario.openFixture(fixtureUlforceXRoyalKnight);
  await scenario.resolveUntil((s) => s.phase === "Main" && s.turnSeat === 0 && !s.pendingDecision);
  const before = await scenario.snapshot();
  expect(before.memory).toBe(3);

  await scenario.play("Veemon", "Digimon");
  const offered: string[][] = [];
  await scenario.resolveUntil(
    (s) =>
      s.players[0]!.hand.some((card) => card.cardId === "BT12-029") &&
      s.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX13-017") &&
      !s.pendingDecision,
    (decision) => {
      if (decision.kind !== "selectCards") return {};
      const candidates = decision.options.candidateInstanceIds ?? [];
      offered.push(
        candidates.map(
          (instanceId) => decision.options.visibleCards?.find((card) => card.instanceId === instanceId)?.cardId ?? "",
        ),
      );
      return { cardId: "BT12-029" };
    },
  );

  expect(offered).toHaveLength(1);
  expect([...offered[0]!].sort()).toEqual(["BT12-029", "BT22-023", "P-138"]);
  const after = await scenario.snapshot();
  expect(after.players[0]!.hand.map((card) => card.cardId)).toContain("BT12-029");
  expect(after.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT22-023");
  expect(after.players[0]!.hand.map((card) => card.cardId)).not.toContain("P-138");
  await scenario.healthy();
});
