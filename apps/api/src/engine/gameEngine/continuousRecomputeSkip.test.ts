import { afterEach, expect, it } from "vitest";
import { runReplay } from "#api/replays/inputs/run";
import type { ReplayRecord } from "#api/replays/inputs/types";
import { runBotMatch } from "#api/bot/matchHarness";
import { continuousSkipVerifier } from "#api/engine/mutationClock/continuousSkipVerifier";
import { installContinuousSkipVerification } from "#api/engine/testkit/installContinuousSkipVerification";

afterEach(() => {
  continuousSkipVerifier.verify = undefined;
});

it.each([20261103, 20261104])(
  "skips only continuous recomputes whose result would not change in a full bot match (seed %i)",
  async (seed) => {
    const verification = installContinuousSkipVerification();
    const result = await runBotMatch({
      seed,
      seats: [{ profile: "balanced" }, { profile: "aggressive" }],
      turnLimit: 12,
    });
    expect(result.errors).toEqual([]);
    expect(verification.mismatches).toEqual([]);
    expect(verification.verified).toBeGreaterThan(0);
  },
  60_000,
);

async function replayBatches(record: ReplayRecord, reuse: boolean): Promise<string[]> {
  const batches: string[] = [];
  const run = await runReplay(structuredClone(record), {
    beforeInput: (_input, _index, engine) => {
      engine.reuseUnchangedContinuousRecomputes = reuse;
    },
    onBatch: (state, events) => batches.push(JSON.stringify({ state: state.toJSON(), events })),
  });
  expect(run.divergences).toEqual([]);
  return batches;
}

it.each([20261103, 20261104])(
  "replays a match identically when a live engine reuses unchanged recomputes (seed %i)",
  async (seed) => {
    const { replay, errors } = await runBotMatch({
      seed,
      seats: [{ profile: "balanced" }, { profile: "aggressive" }],
      turnLimit: 12,
      recordReplay: true,
    });
    expect(errors).toEqual([]);
    const recomputed = await replayBatches(replay!, false);
    const reused = await replayBatches(replay!, true);
    expect(recomputed.length).toBeGreaterThan(0);
    expect(reused).toEqual(recomputed);
  },
  60_000,
);
