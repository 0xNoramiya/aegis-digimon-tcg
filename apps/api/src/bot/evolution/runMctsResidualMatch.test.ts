import { describe, expect, it } from "vitest";
import { BLUE_DECK, RED_DECK } from "#api/engine/testDecks";
import { evolutionDeck } from "#api/bot/evolution/decks";
import { runResidualMatch } from "#api/bot/evolution/residualMatch";
import { SEED_RESIDUAL } from "#api/bot/evolution/residualPolicy";
import { runMctsResidualMatch } from "#api/bot/evolution/runMctsResidualMatch";

describe("residual policy with real-engine MCTS", () => {
  it.each([
    { learnerSeat: 0 as const, weight: 0 },
    { learnerSeat: 1 as const, weight: 0 },
    { learnerSeat: 0 as const, weight: 0.2 },
    { learnerSeat: 1 as const, weight: 0.2 },
  ])(
    "reproduces the unchanged policy in seat $learnerSeat with residual weight $weight",
    async ({ learnerSeat, weight }) => {
      const input = {
        seed: 719,
        learnerSeat,
        decks: [evolutionDeck("bt1-red-omnimon").deck, evolutionDeck("bt4-yellow-wargreymon").deck] as const,
        program: {
          ...SEED_RESIDUAL,
          rules: SEED_RESIDUAL.rules.map((rule) => ({
            ...rule,
            weight: rule.feature === "sourceDp" ? weight : 0,
          })),
        },
      };
      const control = await runResidualMatch(input);
      const search = await runMctsResidualMatch({ ...input, simulations: 0, searchSeed: 917 });
      expect(search.valid).toBe(true);
      expect(search.searches).toEqual([]);
      expect(search.result.winnerSeat).toBe(control.result.winnerSeat);
      expect(search.result.turnCount).toBe(control.result.turnCount);
      expect(search.result.events).toEqual(control.result.events);
    },
  );

  it.each([0, 1] as const)("restores a complete valid search in learner seat %i", async (learnerSeat) => {
    const game = await runMctsResidualMatch({
      seed: 719,
      learnerSeat,
      decks: [RED_DECK, BLUE_DECK],
      program: SEED_RESIDUAL,
      simulations: 2,
      searchSeed: 917,
      maxSearches: 1,
      startAfterDecisions: 4,
    });
    expect(game.result.errors).toEqual([]);
    expect(game.result.rejections).toEqual([]);
    expect(game.valid).toBe(true);
    expect(game.searches).toHaveLength(1);
    expect(game.searches[0]).toMatchObject({
      seat: learnerSeat,
      requested: 2,
      completed: 2,
      invalid: 0,
    });
    expect(game.searches[0]!.elapsedMs).toBeGreaterThan(0);
    expect(game.replayedChoices).toBeGreaterThan(0);
    expect(game.result.projectionChecks).toBeGreaterThan(0);
    expect(game.result.seats.map((seat) => seat.inferenceFallbacks)).toEqual([
      { error: 0, timeout: 0 },
      { error: 0, timeout: 0 },
    ]);
  });

  it("can place search on the opponent while retaining the residual learner", async () => {
    const game = await runMctsResidualMatch({
      seed: 719,
      learnerSeat: 0,
      searchSeat: 1,
      decks: [RED_DECK, BLUE_DECK],
      program: SEED_RESIDUAL,
      opponentProgram: SEED_RESIDUAL,
      simulations: 1,
      searchSeed: 917,
      maxSearches: 1,
    });
    expect(game.valid).toBe(true);
    expect(game.searches).toHaveLength(1);
    expect(game.searches[0]).toMatchObject({ seat: 1, requested: 1, completed: 1 });
  });

  it("restores later effect-driven decisions after an earlier searched move", async () => {
    const game = await runMctsResidualMatch({
      seed: 32000031,
      learnerSeat: 0,
      decks: [evolutionDeck("ex4-dgo-2022-06-25-1-ulforceveedramon").deck, evolutionDeck("bt8-blackwargreymon").deck],
      program: SEED_RESIDUAL,
      simulations: 2,
      searchSeed: 917,
      maxSearches: 2,
      startAfterDecisions: 8,
    });
    expect(game.result.errors).toEqual([]);
    expect(game.result.rejections).toEqual([]);
    expect(game.valid).toBe(true);
    expect(game.searches).toHaveLength(2);
    expect(game.searches.every((search) => search.completed === 2 && search.invalid === 0)).toBe(true);
    expect(game.result.projectionChecks).toBeGreaterThan(0);
  }, 30000);

  it("rejects invalid search counts before admitting a match", async () => {
    await expect(
      runMctsResidualMatch({
        seed: 719,
        learnerSeat: 0,
        decks: [RED_DECK, BLUE_DECK],
        program: SEED_RESIDUAL,
        simulations: -1,
        searchSeed: 917,
      }),
    ).rejects.toThrow("Invalid residual MCTS search budget");
  });

  it("keeps an externally cancelled search match invalid", async () => {
    const controller = new AbortController();
    const game = await runMctsResidualMatch({
      seed: 719,
      learnerSeat: 0,
      decks: [RED_DECK, BLUE_DECK],
      program: SEED_RESIDUAL,
      simulations: 1,
      searchSeed: 917,
      signal: controller.signal,
      onSearch: () => controller.abort(),
    });
    expect(game.valid).toBe(false);
    expect(game.result.reason).toBe("cancelled");
    expect(game.searches).toHaveLength(1);
  });
});
