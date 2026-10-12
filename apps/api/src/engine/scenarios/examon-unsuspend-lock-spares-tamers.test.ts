import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/examon-unsuspend-lock-spares-tamers.fixture";

describe("BT23-047 Examon unsuspend lock", () => {
  it("suspends opposing Tamers but locks only Digimon through the next unsuspend phase", async () => {
    const s = setupScenario(fixture, { autoDeclineOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("csBase").permanentId,
        instanceId: s.inst("examon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lockedDigimon").isSuspended && s.perm("tamer").isSuspended);
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).isRestricted(s.perm("lockedDigimon"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("lockedDigimon").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("lockedDigimon").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
