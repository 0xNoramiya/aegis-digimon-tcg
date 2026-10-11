import { expect, it } from "vitest";
import { evolutionDeck } from "./decks.js";
import { runResidualMatch } from "./residualMatch.js";
import { SEED_RESIDUAL } from "./residualPolicy.js";

it("refuses a replaced balanced control even when the override is neutral", async () => {
  const decks = [evolutionDeck("bt1-red-omnimon").deck, evolutionDeck("bt4-yellow-wargreymon").deck] as const;
  await expect(
    runResidualMatch({ seed: 719, learnerSeat: 0, decks, program: SEED_RESIDUAL, opponentProgram: SEED_RESIDUAL }),
  ).rejects.toThrow("Balanced comparison cannot override the control policy");
});

it("a neutral residual reproduces the balanced control's real game in both learner seats", async () => {
  const decks = [evolutionDeck("bt1-red-omnimon").deck, evolutionDeck("bt4-yellow-wargreymon").deck] as const;
  const results = [];
  for (const learnerSeat of [0, 1] as const) {
    const game = await runResidualMatch({ seed: 719, learnerSeat, decks, program: SEED_RESIDUAL, captureTraces: true });
    expect(game.valid).toBe(true);
    expect(game.result.rejections).toEqual([]);
    expect(game.result.errors).toEqual([]);
    expect(game.result.projectionChecks).toBeGreaterThan(0);
    expect(game.traces.length).toBeGreaterThan(0);
    results.push(game.result);
  }
  expect(results[0]!.winnerSeat).toBe(results[1]!.winnerSeat);
  expect(results[0]!.turnCount).toBe(results[1]!.turnCount);
  expect(results[0]!.events).toEqual(results[1]!.events);
});
