import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/belphemon-discard-controller.fixture";
import "#api/cards/EX6/EX6-060";

it.each([false, true])("Belphemon discards only its controller's hand with digivolve=$digivolve", async (digivolve) => {
  const preferred: string[] = [];
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
  preferred.push(s.inst("opponentHand").instanceId, s.inst("ownPayment").instanceId, s.inst("target").instanceId);
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    const instanceId = s.inst("belphemon").instanceId;
    const intent = digivolve
      ? { type: "digivolve" as const, permanentId: s.perm("base").permanentId, instanceId }
      : { type: "playCard" as const, instanceId };
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    const selection = s.decisions.find(({ req }) => req.sourceCardId === "EX6-060" && req.kind === "selectCards")!;
    expect(selection.req.options?.candidateInstanceIds).not.toContain(s.inst("opponentHand").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentHand").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownPayment").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
