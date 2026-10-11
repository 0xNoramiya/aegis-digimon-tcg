import { readFileSync } from "node:fs";
import { getCardDefinition, type Seat } from "@aegis/shared";
import { FEATURES, parseHeuristic, SEED_HEURISTIC } from "./heuristic.js";
import { randomDeck } from "./randomDecks.js";

// One isolated evaluation per process; application diagnostics stay off JSON stdout.
process.env.NODE_ENV = "test";
console.log = (...values: unknown[]) => console.error(...values);
const { runEvolutionMatch } = await import("./evolutionMatch.js");
const { evolutionDeck, EVOLUTION_DECK_VERSIONS } = await import("./decks.js");
const { trainingMetadata } = await import("../training/metadata.js");

if (process.argv.includes("--describe")) {
  process.stdout.write(
    `${JSON.stringify({
      ...trainingMetadata(),
      features: FEATURES,
      seedProgram: SEED_HEURISTIC,
      deckVersions: EVOLUTION_DECK_VERSIONS,
      evolutionDecks: EVOLUTION_DECK_VERSIONS.map(evolutionDeck),
      cards: [
        ...new Set(
          EVOLUTION_DECK_VERSIONS.flatMap((version) => {
            const { deck } = evolutionDeck(version);
            return [...deck.mainDeck, ...deck.eggDeck];
          }),
        ),
      ].map((id) => {
        const card = getCardDefinition(id)!;
        return {
          cardId: id,
          name: card.nameEn,
          level: card.level,
          dp: card.dp,
          playCost: card.playCost,
          effectText: card.effectText,
          inheritedEffectText: card.inheritedEffectText,
        };
      }),
      mcts: { defaultSimulations: 256, reconstruction: "exact-engine-replay", belief: "uniform-open-decklist" },
    })}\n`,
  );
  process.exitCode = 0;
} else {
  try {
    const input = JSON.parse(readFileSync(0, "utf8")) as {
      seed: number;
      learnerSeat: Seat;
      decks: [string | number, string | number];
      program: unknown;
      opponentProgram?: unknown;
      opponent?: "heuristic" | "mcts";
      simulations?: number;
      searchSeed?: number;
      turnLimit?: number;
      captureTraces?: boolean;
      engineSha256?: string;
    };
    if (
      !Number.isSafeInteger(input.seed) ||
      (input.learnerSeat !== 0 && input.learnerSeat !== 1) ||
      !Array.isArray(input.decks) ||
      input.decks.length !== 2 ||
      !input.decks.every((deck) => typeof deck === "string" || Number.isSafeInteger(deck)) ||
      (input.turnLimit !== undefined &&
        (!Number.isSafeInteger(input.turnLimit) || input.turnLimit < 1 || input.turnLimit > 200)) ||
      (input.opponent !== undefined && !["mcts", "heuristic"].includes(input.opponent)) ||
      (input.simulations !== undefined &&
        (!Number.isSafeInteger(input.simulations) || input.simulations < 1 || input.simulations > 10000)) ||
      (input.searchSeed !== undefined && !Number.isSafeInteger(input.searchSeed))
    )
      throw new Error("Invalid evaluation configuration");
    if (input.engineSha256 !== undefined && input.engineSha256 !== trainingMetadata().engineSha256)
      throw new Error("Worker engine changed since experiment was pinned");
    const program = parseHeuristic(input.program);
    const opponentProgram = input.opponentProgram === undefined ? undefined : parseHeuristic(input.opponentProgram);
    const decks = input.decks.map((source) =>
      typeof source === "number" ? randomDeck(source) : evolutionDeck(source),
    );
    const { result, valid, decisions, traces, searches } = await runEvolutionMatch({
      seed: input.seed,
      decks: [decks[0]!.deck, decks[1]!.deck],
      learnerSeat: input.learnerSeat,
      program,
      opponentProgram,
      ...(input.opponent === "mcts"
        ? { mcts: { simulations: input.simulations ?? 256, seed: input.searchSeed ?? 0x5ea2c4 } }
        : {}),
      turnLimit: input.turnLimit,
      captureTraces: input.captureTraces,
      onSearch: (report) =>
        process.stderr.write(
          `${JSON.stringify({
            type: "mcts-search",
            requested: report.requested,
            attempted: report.attempted,
            completed: report.completed,
            invalid: report.invalid,
            nodes: report.nodes,
          })}\n`,
        ),
    });
    const asynchronousRejections = result.events!.filter((event) => event.kind === "actionRejected");
    const score = valid
      ? result.winnerSeat === undefined
        ? 0.5
        : Number(result.winnerSeat === input.learnerSeat)
      : null;
    process.stdout.write(
      `${JSON.stringify({
        schemaVersion: 1,
        seed: input.seed,
        learnerSeat: input.learnerSeat,
        decks: decks.map(({ id }) => id),
        opponent: input.opponent === "mcts" ? "information-set-mcts" : "coevolved-heuristic",
        score,
        status: valid ? "played" : result.timedOut ? "timed-out" : "invalid",
        valid,
        result: { ...result, events: undefined },
        asynchronousRejections,
        decisions,
        traces,
        searches,
      })}\n`,
    );
    process.exitCode = valid ? 0 : 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
    process.exitCode = 1;
  }
}
