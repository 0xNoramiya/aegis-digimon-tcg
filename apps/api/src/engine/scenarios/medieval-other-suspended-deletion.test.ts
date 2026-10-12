import { expect, it } from "vitest";
import type { ScenarioFixture } from "#api/engine/scenario/types";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/medieval-other-suspended-deletion.fixture";
import "#api/cards/EX8/EX8-074";
import "#api/cards/BT26/BT26-079";
import "#api/cards/BT26/BT26-100";
import "#api/cards/BT6/BT6-018";
import "#api/cards/BT1/BT1-009";

it.each([
  { targetCard: "BT26-079", extraSuspended: false, deleted: false, expectedDP: 15000 },
  { targetCard: "BT6-018", extraSuspended: false, deleted: true, expectedDP: 14000 },
  { targetCard: "BT26-079", extraSuspended: true, deleted: true, expectedDP: 15000 },
])(
  "self suspension does not raise the deletion ceiling for $targetCard with extra suspended=$extraSuspended",
  async ({ targetCard, extraSuspended, deleted, expectedDP }) => {
    const prepared: ScenarioFixture = {
      ...fixture,
      board: {
        ...fixture.board,
        1: {
          ...fixture.board[1],
          battleArea: [
            { card: targetCard, as: "target" },
            ...(extraSuspended ? [{ card: "BT1-009", as: "extra", suspended: true }] : []),
          ],
        },
      },
    };
    const preferred: string[] = [];
    const s = setupScenario(prepared, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      preferInstanceIds: preferred,
    });
    preferred.push(s.inst("medieval").instanceId, s.inst("ally").instanceId, s.inst("target").instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.perm("target").currentDP).toBe(expectedDP);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("medieval").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      const medieval = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.instanceId === s.inst("medieval").instanceId,
      )!;
      expect(medieval.isSuspended).toBe(true);
      expect(s.state.memory).toBe(0);
      expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(deleted);
      expect(
        s.decisions.some(({ req }) => req.sourceCardId === "EX8-074" && req.options?.targetFate === "delete"),
      ).toBe(deleted);
      expect(
        s.events.some(
          (event) =>
            event.kind === "effectTriggered" && event.sourceCardId === "EX8-074" && event.timing === "WhenDigivolving",
        ),
      ).toBe(true);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  },
);
