import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/mother-d-reaper-digimon-cost.fixture";
import "#api/cards/EX2/EX2-007";
import "#api/cards/EX2/EX2-046";
import "#api/cards/EX2/EX2-047";
import "#api/cards/P/P-158";

it("pays Jeri's full Tamer cost and preserves Mother D-Reaper's reduction for a Digimon", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    expect(s.state.memory).toBe(4);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX2-007")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    expect(s.state.memory).toBe(3);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX2-007")).toBe(true);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
