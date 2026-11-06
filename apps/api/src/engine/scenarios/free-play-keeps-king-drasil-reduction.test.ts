import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/free-play-keeps-king-drasil-reduction.fixture";
import "#api/cards/BT13/BT13-007";
import "#api/cards/BT13/BT13-110";
import "#api/cards/BT20/BT20-017";
import "#api/cards/EX13/EX13-015";
import "#api/cards/BT25/BT25-001";

const reductionPrompt = "reduce the play cost by 4";

it("keeps King Drasil's once-per-turn reduction for a paid Royal Knight after a free Royal Knight play", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);
    const purge = s.perm("royalPurge");
    const delay = (
      JSON.parse(purge.activatableEffectsJson || "[]") as { effectKey: string; description?: string }[]
    ).find(({ description }) => description?.includes("Delay"));
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: purge.topCard.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);

    const player = s.state.players[0]!;
    expect(player.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("delayedKnight").instanceId)).toBe(
      true,
    );
    expect(s.decisions.filter(({ req }) => req.promptText === reductionPrompt)).toHaveLength(0);

    const memoryBefore = s.state.memory;
    const kingDrasilSources = player.breeding!.stack.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jesmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);

    expect(s.decisions.filter(({ req }) => req.promptText === reductionPrompt)).toHaveLength(1);
    expect(player.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("jesmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryBefore - (11 - 4 - kingDrasilSources));
    expect(s.state.turnSeat).toBe(0);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
