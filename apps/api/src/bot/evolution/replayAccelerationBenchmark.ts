import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { runEvolutionMatch } from "#api/bot/evolution/evolutionMatch";
import { SEED_HEURISTIC } from "#api/bot/evolution/heuristic";
import { randomDeck } from "#api/bot/evolution/randomDecks";
import type { Seat } from "@aegis/shared/schema/enums";

async function main(): Promise<void> {
  const input = JSON.parse(readFileSync(0, "utf8")) as {
    simulations: number;
    seed?: number;
    learnerSeat?: Seat;
    repetitions?: number;
    mode?: "single-search-after-prefix" | "full-game";
    startAfterDecisions?: number;
  };
  const repetitions = input.repetitions ?? 2;
  const mode = input.mode ?? "single-search-after-prefix";
  if (mode !== "single-search-after-prefix" && mode !== "full-game") throw new Error("Unknown benchmark mode");
  if (!Number.isSafeInteger(input.simulations) || input.simulations <= 0)
    throw new Error("Benchmark simulations must be a positive safe integer");
  const startAfterDecisions = input.startAfterDecisions ?? 16;
  if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 8)
    throw new Error("Benchmark repetitions must be from 1 to 8");
  if (input.learnerSeat !== undefined && input.learnerSeat !== 0 && input.learnerSeat !== 1)
    throw new Error("Benchmark learner seat must be zero or one");
  const samples: {
    enabled: boolean;
    durationMs: number;
    identity: string;
    requestedRollouts: number;
    completedRollouts: number;
    invalidRollouts: number;
    restoration: Awaited<ReturnType<typeof runEvolutionMatch>>["restoration"];
  }[] = [];
  for (let repetition = 0; repetition < repetitions; repetition++) {
    for (const enabled of repetition % 2 === 0 ? [false, true] : [true, false]) {
      const start = performance.now();
      const result = await runEvolutionMatch({
        seed: input.seed ?? 42,
        learnerSeat: input.learnerSeat ?? 0,
        decks: [randomDeck(1).deck, randomDeck(2).deck],
        program: SEED_HEURISTIC,
        mcts: {
          simulations: input.simulations,
          seed: 619,
          reusePrefixActions: enabled,
          ...(mode === "single-search-after-prefix" ? { startAfterDecisions, maxSearches: 1 } : {}),
        },
        turnLimit: 60,
        captureTraces: true,
        onSearch: (search) => {
          process.stderr.write(JSON.stringify({ repetition, enabled, search }) + "\n");
        },
      });
      const durationMs = performance.now() - start;
      if (!result.valid || result.searches.length === 0)
        throw new Error("Benchmark requires a complete valid real-engine search match");
      if (mode === "single-search-after-prefix" && result.searches.length !== 1)
        throw new Error("Bounded benchmark requires exactly one real-engine search");
      if (result.searches.some((search) => search.completed !== input.simulations || search.invalid !== 0))
        throw new Error("Benchmark requires the exact completed budget and zero invalid rollouts");
      if (enabled && result.restoration.reusedMainCatalogs === 0)
        throw new Error("Benchmark must exercise recorded main catalog reuse");
      const identity = createHash("sha256")
        .update(
          JSON.stringify({
            result: {
              ...result.result,
              seats: result.result.seats.map(({ decisionLatenciesMs: _decisionLatenciesMs, ...stats }) => stats),
            },
            searches: result.searches,
            traces: result.traces,
            decisions: result.decisions,
          }),
        )
        .digest("hex");
      if (samples.length > 0 && identity !== samples[0]!.identity)
        throw new Error("Prefix acceleration changed the seeded game, actions or search report");
      const sample = {
        enabled,
        durationMs,
        identity,
        requestedRollouts: result.searches.reduce((total, search) => total + search.requested, 0),
        completedRollouts: result.searches.reduce((total, search) => total + search.completed, 0),
        invalidRollouts: result.searches.reduce((total, search) => total + search.invalid, 0),
        restoration: result.restoration,
      };
      samples.push(sample);
      process.stderr.write(JSON.stringify({ repetition, ...sample }) + "\n");
    }
  }
  const duration = (enabled: boolean): number =>
    samples.filter((sample) => sample.enabled === enabled).reduce((total, sample) => total + sample.durationMs, 0);
  process.stdout.write(
    JSON.stringify({
      schemaVersion: 1,
      nodeVersion: process.version,
      simulations: input.simulations,
      mode,
      ...(mode === "single-search-after-prefix" ? { startAfterDecisions, maxSearches: 1 } : {}),
      seed: input.seed ?? 42,
      learnerSeat: input.learnerSeat ?? 0,
      repetitions,
      equivalent: true,
      speedup: duration(false) / duration(true),
      savedWallTimeFraction: 1 - duration(true) / duration(false),
      samples,
    }) + "\n",
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(String(error) + "\n");
  process.exitCode = 1;
});
