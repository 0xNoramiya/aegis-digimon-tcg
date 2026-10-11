import fixtureClimbmonPistmonPlay from "../../api/src/engine/scenarios/climbmon-pistmon-play.fixture";
import { fixtureInstanceId } from "../../api/src/engine/scenario/references";
import { test, expect } from "./scenario-page";

test("Pistmon's On Play completes inside Climbmon's evolution", async ({ scenario }) => {
  await scenario.openFixture(fixtureClimbmonPistmonPlay);
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const base = (await scenario.snapshot()).players[0]!.battleArea[0]!;
  await scenario.evolve("Climbmon", base.permanentId);
  await scenario.resolveUntil(
    (s) => s.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-044") && !s.pendingDecision,
    (d) =>
      d.kind === "selectCards"
        ? {
            cardId: d.options.candidateInstanceIds?.includes(fixtureInstanceId("report-pistmon-card"))
              ? "BT16-044"
              : "BT1-009",
          }
        : {},
  );
  const final = await scenario.snapshot();
  expect(final.memory).toBe(7);
  expect(final.players[0]!.securityCount).toBe(3);
  expect(final.players[1]!.battleArea[0]!.isSuspended).toBe(true);
  expect(final.players[0]!.deckCount).toBe(16);
  expect(final.players[0]!.trash.some((c) => c.instanceId === fixtureInstanceId("report-pistmon-card"))).toBe(false);
  expect(
    (await scenario.presentation()).events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "BT16-044"),
  ).toBe(true);
  await scenario.healthy();
});
