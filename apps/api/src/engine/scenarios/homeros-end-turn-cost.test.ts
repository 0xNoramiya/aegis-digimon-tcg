import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import fixture from "#api/engine/scenarios/homeros-end-turn-cost.fixture";
import "#api/cards/BT24/BT24-102";
import "#api/cards/BT24/BT24-040";
import "#api/cards/BT26/BT26-103";

it("Homeros cannot repeat Wrath Mode's spent effect but can activate it during the next own turn", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(4);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wrath").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "BT26-103" && event.timing === "WhenDigivolving",
      ),
    ).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("homeros").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(7);
    expect(
      s.decisions.some(({ req }) => req.sourceCardId === "BT24-102" && req.options?.timing === "EndOfYourTurn"),
    ).toBe(true);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
