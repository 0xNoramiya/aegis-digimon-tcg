import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import fixture from "#api/engine/scenarios/truskmore-independent-targets.fixture";
import "#api/cards/EX12/EX12-052";
import "#api/cards/BT1/BT1-082";
import "#api/cards/BT1/BT1-085";

type RespondTargetsParams = {
  s: ReturnType<typeof setupScenario>;
  instanceIds: string[];
};

async function respondTargets({ s, instanceIds }: RespondTargetsParams) {
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response: { kind: "chooseTargets", instanceIds },
    }),
  ).toEqual({ ok: true });
}

it("Truskmore suspends Digimon and independently locks a different Digimon and Tamer", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, declinePrompts: ["Arts Digivolve"] });
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("own").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && !s.state.combatWindow);
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await respondTargets({ s, instanceIds: [s.perm("own").permanentId] });
    await respondTargets({ s, instanceIds: [s.perm("suspendFirst").permanentId, s.perm("suspendSecond").permanentId] });
    await respondTargets({ s, instanceIds: [s.perm("lockDigimon").permanentId, s.perm("lockTamer").permanentId] });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    expect(s.perm("own").isSuspended).toBe(false);
    for (const alias of ["suspendFirst", "suspendSecond"]) {
      expect(s.perm(alias).isSuspended).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(false);
    }
    for (const alias of ["lockDigimon", "lockTamer"])
      expect(observe(s.engine).isRestricted(s.perm(alias), "unsuspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("suspendFirst").isSuspended).toBe(false);
    expect(s.perm("suspendSecond").isSuspended).toBe(false);
    expect(s.perm("lockDigimon").isSuspended).toBe(true);
    expect(s.perm("lockTamer").isSuspended).toBe(true);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
