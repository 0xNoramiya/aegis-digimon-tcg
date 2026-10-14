import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { observe } from "#api/engine/testkit/observe";
import { settle } from "#api/engine/testkit/harness";
import fixture, { sameColorBreedingFixture } from "#api/engine/scenarios/digital-gate-delay-tamer-color-match.fixture";
import "#api/cards/P/P-206";
import "#api/cards/EX9/EX9-066";
import "#api/cards/BT22/BT22-005";

async function activateDelay(board: typeof fixture) {
  const s = setupScenario(board, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  const memoryBefore = s.state.memory;
  const delay = observe(s.engine)
    .activatableEffects(s.perm("digitalGate"))
    .find((effect) => /delay/i.test(effect.description ?? ""));
  expect(delay).toBeDefined();
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: delay!.instanceId!,
      effectKey: delay!.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("digitalGate").instanceId) &&
      s.engine.mainVerbContinuationsInFlight === 0 &&
      !s.state.pendingDecision,
  );
  const finish = async () => {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  };
  return { s, memoryBefore, finish };
}

describe("Digital Gate Open Delay Tamer color match", () => {
  it("ignores Tamers on the field when matching the Tamer color", async () => {
    const { s, memoryBefore, finish } = await activateDelay(fixture);
    try {
      const player = s.state.players[0]!;
      expect(player.hand.map((card) => card.instanceId)).toContain(s.inst("handTaiAndMatt").instanceId);
      expect(player.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
        s.inst("fieldTaiAndMatt").instanceId,
      ]);
      expect(s.state.memory).toBe(memoryBefore);
    } finally {
      await finish();
    }
  });

  it("plays the Tamer for 0 when a breeding Digimon shares one of its colors", async () => {
    const { s, memoryBefore, finish } = await activateDelay(sameColorBreedingFixture);
    try {
      const player = s.state.players[0]!;
      expect(player.hand.map((card) => card.instanceId)).not.toContain(s.inst("handTaiAndMatt").instanceId);
      expect(player.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
        s.inst("handTaiAndMatt").instanceId,
      );
      expect(s.state.memory).toBe(memoryBefore);
    } finally {
      await finish();
    }
  });
});
