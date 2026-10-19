import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

process.env.NODE_ENV = "test";
process.env.AEGIS_STRICT_EFFECTS = "0";
console.log = console.info = console.debug = (...values: unknown[]) => console.error(...values);
const { extractReplay } = await import("#api/replays/inputs/extract");
const { replayPositions } = await import("#api/bot/evolution/replayPositions");
const { defaultBotOptions } = await import("#api/bot/defaultBotOptions");
const { createEvaluationPolicy } = await import("#api/bot/policy");
const { resolveBotProfile } = await import("#api/bot/profiles");
const { buildBotView } = await import("#api/bot/view");
const { chooseHeuristic, parseHeuristic, SEED_HEURISTIC } = await import("#api/bot/evolution/heuristic");

const [logDirectory, output, ...programPaths] = process.argv.slice(2);
if (logDirectory === undefined || output === undefined)
  throw new Error("Usage: replayPositionsCli <replay-log-directory> <output.jsonl> [heuristic-program.json...]");
const programs = Object.fromEntries([
  ["seed", SEED_HEURISTIC] as const,
  ...programPaths.map(
    (path) => [basename(path, ".json"), parseHeuristic(JSON.parse(readFileSync(path, "utf8")))] as const,
  ),
]);
const lines: string[] = [];
for (const file of readdirSync(logDirectory)
  .filter((name) => name.endsWith(".jsonl"))
  .sort()) {
  const matchId = basename(file, ".jsonl");
  try {
    const record = extractReplay(readFileSync(join(logDirectory, file), "utf8").split("\n"), matchId);
    const certifiedPolicies = new Map<number, NonNullable<ReturnType<typeof defaultBotOptions>["policy"]>>();
    const legacyPolicies = new Map<number, ReturnType<typeof createEvaluationPolicy>>();
    const result = await replayPositions(record, {
      legacy: (engine, seat) => {
        let policy = legacyPolicies.get(seat);
        if (policy === undefined) {
          policy = createEvaluationPolicy({ profile: resolveBotProfile(undefined), seed: 0x5eed });
          legacyPolicies.set(seat, policy);
        }
        const view = buildBotView(engine.state, seat);
        if (view === undefined) throw new Error("Legacy advisor has no view");
        return policy.chooseMainAction(view);
      },
      certified: (engine, seat) => {
        let policy = certifiedPolicies.get(seat);
        if (policy === undefined) {
          policy = defaultBotOptions({ engine, seat, deck: record.seats[seat].deck }).policy!;
          certifiedPolicies.set(seat, policy);
        }
        const view = buildBotView(engine.state, seat);
        if (view === undefined) throw new Error("Certified advisor has no view");
        const choice = policy.chooseMainAction(view);
        if (choice instanceof Promise) throw new Error("Certified advisor must choose synchronously");
        return choice;
      },
      ...Object.fromEntries(
        Object.entries(programs).map(([name, program]) => [
          name,
          (_engine, _seat, window) => chooseHeuristic(program, window),
        ]),
      ),
    });
    lines.push(JSON.stringify({ file, ...result }));
    process.stderr.write(
      `${file} positions=${result.positions.length} divergence=${result.firstDivergence} winner=${result.winnerSeat}\n`,
    );
  } catch (error) {
    lines.push(JSON.stringify({ file, error: error instanceof Error ? error.message : String(error) }));
    process.stderr.write(`${file} error=${error instanceof Error ? error.message : String(error)}\n`);
  }
}
writeFileSync(output, lines.join("\n") + "\n");
