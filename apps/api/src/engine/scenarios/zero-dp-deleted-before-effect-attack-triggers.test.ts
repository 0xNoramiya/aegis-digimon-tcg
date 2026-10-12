import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/zero-dp-deleted-before-effect-attack-triggers.fixture";
import "#api/cards/EX12/EX12-045";
import "#api/cards/EX12/EX12-048";

it("deletes a Digimon an attack-ordering effect reduced to 0 DP before the attacker's [When Attacking] effects", async () => {
  const preferred: string[] = [];
  const s = setupScenario(fixture, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    preferInstanceIds: preferred,
    preferTriggerKeys: ["EX12-045"],
    declinePrompts: ["Raid"],
  });
  const zeroDpTargetId = s.perm("zeroDpTarget").permanentId;
  const survivorIds = [s.perm("survivor").permanentId, s.perm("otherSurvivor").permanentId];
  preferred.push(zeroDpTargetId);
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("sanzomon").permanentId,
        instanceId: s.inst("seitenGokuumon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision);

    const deletion = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        (event.deletedPermanents ?? []).some(({ permanentId }) => permanentId === zeroDpTargetId),
    );
    const attackDeclared = s.events.findIndex((event) => event.kind === "attackDeclared");
    const inheritedWhenAttacking = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.effectKey === "EX12-045/ir-12-0",
    );
    const inheritedTargets = s.decisions.find(
      ({ req }) => req.kind === "chooseTargets" && req.options?.effectKey === "EX12-045/ir-12-0",
    )?.req.options?.candidateInstanceIds;

    expect(attackDeclared).toBeGreaterThan(-1);
    expect(deletion).toBeGreaterThan(attackDeclared);
    expect(inheritedWhenAttacking).toBeGreaterThan(deletion);
    expect(inheritedTargets).toEqual(survivorIds);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(zeroDpTargetId);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
