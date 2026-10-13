import { afterEach, beforeEach, describe, it, expect } from "vitest";
import type { CompiledCard } from "@aegis/shared";
import "../cards/index.js";
import { registerIrCard, runtimeCompiledCard } from "./effects/interpreter.js";
import { unregisterCard } from "./effects/registry.js";
import { setupEngine } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

/**
 * CR-01 A3: a `Static` `Replacement{mode:"reduceCost"}` installed during the continuous recompute
 * must NOT accumulate across recomputes. `recomputeContinuousEffects` brackets every timing window
 * (and is invoked several times per turn), so a missing `clearContinuous` on the SubTrigger
 * registry makes `costReductionFor` report N, 2N, 3N… as recomputes pile up — the exact
 * accumulation class ST3-12 fixed for the security-DP ledger.
 *
 * FAILS-WHEN-REVERTED: remove `this.subTriggers.clearContinuous()` from
 * recomputeContinuousEffects (or drop the `continuous` stamp on subscribeReplacement) =>
 * the reduceCost replacement re-subscribes each recompute and the third recompute reports
 * 3·N instead of N => the "stays at N" assertions go RED.
 */

const RESIDENT_REDUCER = "BT1-009";

function residentPlayCostReducer(amount: number): CompiledCard {
  return {
    effects: [
      {
        trigger: "Static",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "reduceCost",
            amount,
            sourceFilter: { controller: "mine", kind: ["Digimon"] },
          },
        ],
      },
    ],
    coverage: "full",
    residual: [],
  } as CompiledCard;
}

describe("CR-01 — Static reduceCost replacement does not accumulate across continuous recomputes", () => {
  const originalCompiled = runtimeCompiledCard(RESIDENT_REDUCER);

  afterEach(() => {
    unregisterCard(RESIDENT_REDUCER);
    if (originalCompiled !== undefined) registerIrCard(RESIDENT_REDUCER, originalCompiled);
  });

  for (const amount of [1, 6]) {
    describe(`a resident reduction of ${amount}`, () => {
      beforeEach(() => {
        registerIrCard(RESIDENT_REDUCER, residentPlayCostReducer(amount));
      });

      it(`stays at ${amount} over 3 recomputes`, async () => {
        const s = setupEngine({ 0: { battleArea: [{ card: RESIDENT_REDUCER, as: "perm" }] } });
        const perm = s.perm("perm");

        const reductionAfterRecompute = async (): Promise<number> => {
          await s.engine.recomputeContinuousEffects();
          return observe(s.engine).costReduction("wouldBePlayed", perm.permanentId);
        };

        expect(await reductionAfterRecompute()).toBe(amount);
        expect(await reductionAfterRecompute()).toBe(amount);
        expect(await reductionAfterRecompute()).toBe(amount);
      });
    });
  }
});
