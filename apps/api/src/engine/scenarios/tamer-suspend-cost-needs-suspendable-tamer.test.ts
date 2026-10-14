import { EffectDuration, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "#api/cards/BT12/BT12-095";
import "#api/cards/ST1/ST1-03";
import "#api/cards/ST1/ST1-07";
import type { Restriction } from "#api/engine/effects/EffectContext";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import {
  tamerSuspendCostNeedsSuspendableTamer,
  type TamerSuspendCostLock,
} from "#api/engine/scenarios/tamer-suspend-cost-needs-suspendable-tamer.fixture";

const DIGIVOLVE_COST = 2;

async function digivolveIntoGreymon(lock: TamerSuspendCostLock, restriction?: Restriction) {
  const s = setupScenario(tamerSuspendCostNeedsSuspendableTamer(lock), {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: true,
  });
  if (restriction !== undefined) {
    s.engine.continuous.addRestriction(s.perm("tai").permanentId, restriction, EffectDuration.UntilOpponentTurnEnd, {
      originSeat: 1,
    });
    s.engine.projection.syncRestrictions();
  }
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;
    const taiSuspendedBefore = s.perm("tai").isSuspended;
    const promptsBefore = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.cardId === "ST1-07" && s.state.pendingDecision === undefined);
    return {
      memoryBefore,
      taiSuspendedBefore,
      memoryAfter: s.state.memory,
      taiSuspendedAfter: s.perm("tai").isSuspended,
      prompts: s.decisions.slice(promptsBefore).map(({ req }) => req.kind),
    };
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
}

describe("a Tamer's suspend cost needs a Tamer that can suspend", () => {
  it("suspends an unlocked Tai to gain 1 memory when a Digimon digivolves into Greymon", async () => {
    const result = await digivolveIntoGreymon("none");

    expect(result.taiSuspendedBefore).toBe(false);
    expect(result.prompts).toEqual(["optional"]);
    expect(result.taiSuspendedAfter).toBe(true);
    expect(result.memoryAfter).toBe(result.memoryBefore - DIGIVOLVE_COST + 1);
  });

  it("gains no memory when Tai stays suspended under a can't-unsuspend lock", async () => {
    const result = await digivolveIntoGreymon("alreadySuspended", "unsuspend");

    expect(result.taiSuspendedBefore).toBe(true);
    expect(result.prompts).toEqual([]);
    expect(result.taiSuspendedAfter).toBe(true);
    expect(result.memoryAfter).toBe(result.memoryBefore - DIGIVOLVE_COST);
  });

  it("gains no memory when Tai can't suspend", async () => {
    const result = await digivolveIntoGreymon("cantSuspend");

    expect(result.taiSuspendedBefore).toBe(false);
    expect(result.prompts).toEqual([]);
    expect(result.taiSuspendedAfter).toBe(false);
    expect(result.memoryAfter).toBe(result.memoryBefore - DIGIVOLVE_COST);
  });

  it("gains no memory when Tai can't be suspended", async () => {
    const result = await digivolveIntoGreymon("none", "beSuspended");

    expect(result.prompts).toEqual([]);
    expect(result.taiSuspendedAfter).toBe(false);
    expect(result.memoryAfter).toBe(result.memoryBefore - DIGIVOLVE_COST);
  });
});
