import { readFileSync } from "node:fs";
import type { Seat } from "@aegis/shared";
import { chooseHeuristic, parseHeuristic, rankHeuristic } from "./heuristic.js";
import { randomDeck } from "./randomDecks.js";

// One isolated evaluation per process; application diagnostics stay off JSON stdout.
process.env.NODE_ENV = "test";
console.log = (...values: unknown[]) => console.error(...values);
const { runBotMatch } = await import("../matchHarness.js");
const { createTrainingPolicy } = await import("../training/policy.js");
const { mainActionReady } = await import("../training/actions.js");
const { trainingDeck } = await import("../training/decks.js");

try {
  const input = JSON.parse(readFileSync(0, "utf8")) as {
    seed: number;
    learnerSeat: Seat;
    decks: [string | number, string | number];
    program: unknown;
    opponentProgram?: unknown;
    turnLimit?: number;
    captureTraces?: boolean;
  };
  if (
    !Number.isSafeInteger(input.seed) ||
    (input.learnerSeat !== 0 && input.learnerSeat !== 1) ||
    !Array.isArray(input.decks) ||
    input.decks.length !== 2 ||
    !input.decks.every((deck) => typeof deck === "string" || Number.isSafeInteger(deck)) ||
    (input.turnLimit !== undefined &&
      (!Number.isSafeInteger(input.turnLimit) || input.turnLimit < 1 || input.turnLimit > 200))
  )
    throw new Error("Invalid evaluation configuration");
  const program = parseHeuristic(input.program);
  const opponent = input.opponentProgram === undefined ? undefined : parseHeuristic(input.opponentProgram);
  const decks = input.decks.map((source) =>
    typeof source === "number" ? randomDeck(source) : { id: source, deck: trainingDeck(source).deck },
  );
  const traces: unknown[] = [];
  let decisions = 0;
  const seats = decks.map(({ id, deck }, index) => {
    const pilot = index === input.learnerSeat ? program : opponent;
    return {
      deck,
      label: id,
      ...(pilot === undefined
        ? {}
        : {
            policyFactory: (engine: Parameters<typeof createTrainingPolicy>[0], seat: Seat) =>
              createTrainingPolicy(engine, seat, (window) => {
                if (++decisions > 10000) throw new Error("Evaluation decision budget exceeded");
                const action = chooseHeuristic(pilot, window);
                if (input.captureTraces && seat === input.learnerSeat && traces.length < 200) {
                  const ranking = rankHeuristic(pilot, window);
                  traces.push({
                    turn: window.observation.turn,
                    kind: window.kind,
                    action: window.actions[action],
                    score: ranking[0]!.score,
                    reasons: ranking[0]!.contributions.filter((rule) => rule.value !== 0),
                    alternatives: ranking
                      .slice(1, 4)
                      .map((entry) => ({ action: window.actions[entry.index], score: entry.score })),
                  });
                }
                return action;
              }),
            canChooseMainAction: mainActionReady,
            maxMainPhaseActions: Number.POSITIVE_INFINITY,
          }),
    };
  });
  const result = await runBotMatch({
    seed: input.seed,
    seats: [seats[0]!, seats[1]!],
    turnLimit: input.turnLimit ?? 60,
    captureEvents: true,
    verifyProjections: true,
  });
  const asynchronousRejections = result.events!.filter((event) => event.kind === "actionRejected");
  const valid =
    result.errors.length === 0 &&
    result.rejections.length === 0 &&
    asynchronousRejections.length === 0 &&
    !result.timedOut &&
    result.reason !== "stalled";
  const score = valid ? Number(result.winnerSeat === input.learnerSeat) : 0;
  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: 1,
      seed: input.seed,
      learnerSeat: input.learnerSeat,
      decks: decks.map(({ id }) => id),
      opponent: opponent === undefined ? "evaluation-baseline" : "coevolved-heuristic",
      score,
      valid,
      result: { ...result, events: undefined },
      asynchronousRejections,
      decisions,
      traces,
    })}\n`,
  );
  process.exit(valid ? 0 : 1);
} catch (error) {
  process.stdout.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n`);
  process.exit(1);
}
