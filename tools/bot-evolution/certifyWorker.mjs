import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

process.env.NODE_ENV = "test";
console.log = (...values) => console.error(...values);
const input = JSON.parse(readFileSync(0, "utf8"));
const workerHash = () =>
  createHash("sha256")
    .update(readFileSync(fileURLToPath(import.meta.url)))
    .digest("hex");
if (workerHash() !== input.workerSha256) throw new Error("Certification worker fingerprint changed");
const moduleAt = (name) => import(pathToFileURL(resolve(input.apiRoot, name)).href);
const { trainingMetadata } = await moduleAt("bot/training/metadata.js");
if (trainingMetadata().engineSha256 !== input.engineSha256) throw new Error("Certification engine fingerprint changed");
const { parseHeuristic } = await moduleAt("bot/evolution/heuristic.js");
const { evolutionDeck } = await moduleAt("bot/evolution/decks.js");
const { runResidualMatch } = await moduleAt("bot/evolution/residualMatch.js");
const program = parseHeuristic(input.program);
if (program.basePolicy !== "projected-balanced") throw new Error("Certification requires a balanced residual");
const ids = new Set();
const seeds = new Set();
for (const unit of input.units) {
  if (
    !unit.id ||
    ids.has(unit.id) ||
    seeds.has(unit.seed) ||
    !Number.isInteger(unit.seed) ||
    unit.seed < 0 ||
    unit.seed > 0xffffffff ||
    unit.decks.length !== 2 ||
    unit.decks[0] === unit.decks[1]
  )
    throw new Error("Certification requires unique uint32 seeds, IDs and mixed decks");
  ids.add(unit.id);
  seeds.add(unit.seed);
  const decks = unit.decks.map((id) => evolutionDeck(id).deck);
  for (const assignment of [
    [0, 1],
    [1, 0],
  ]) {
    for (const learnerSeat of [0, 1]) {
      const game = await runResidualMatch({
        seed: unit.seed,
        learnerSeat,
        decks: [decks[assignment[0]], decks[assignment[1]]],
        program,
      });
      const { result, valid } = game;
      process.stdout.write(
        JSON.stringify({
          unit: unit.id,
          seed: unit.seed,
          decks: unit.decks,
          assignment,
          learnerSeat,
          valid,
          score: valid ? (result.winnerSeat === undefined ? 0.5 : Number(result.winnerSeat === learnerSeat)) : null,
          winnerSeat: result.winnerSeat,
          reason: result.reason,
          turns: result.turnCount,
          projectionChecks: result.projectionChecks,
          timedOut: result.timedOut,
          fallbacks: result.seats.map((seat) => seat.inferenceFallbacks),
          errors: result.errors,
          rejections: result.rejections,
          asynchronousRejections: result.events.filter((event) => event.kind === "actionRejected"),
        }) + "\n",
      );
    }
  }
}
if (trainingMetadata().engineSha256 !== input.engineSha256)
  throw new Error("Certification engine changed during batch");
if (workerHash() !== input.workerSha256) throw new Error("Certification worker changed during batch");
