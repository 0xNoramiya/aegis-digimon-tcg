import { describe, expect, it } from "vitest";
import { setupEngine } from "#api/engine/testkit/harness";
import { trainingObservation } from "#api/bot/training/observation";
import { evaluateSearchPosition } from "#api/bot/evolution/evaluateSearchPosition";

describe("bounded public-position evaluation", () => {
  it("reverses advantage between seats and values extra security", async () => {
    const setup = setupEngine({ 0: { security: ["BT1-010", "BT1-011"] }, 1: { security: ["BT1-010"] } });
    await setup.ready();
    const own = trainingObservation(setup.state, 0);
    own.memory = 3;
    own.turnSeat = 0;
    const opponent = { ...own, seat: 1 as const };
    const value = evaluateSearchPosition(own);
    expect(value).toBeGreaterThan(0.5);
    expect(value).toBeLessThan(1);
    expect(value + evaluateSearchPosition(opponent)).toBeCloseTo(1);
    const improved = structuredClone(own);
    improved.players[0]!.securityCount++;
    expect(evaluateSearchPosition(improved)).toBeGreaterThan(value);
  });

  it("ignores private card identities and deck order", async () => {
    const setup = setupEngine({ 0: { hand: ["BT1-010"] }, 1: { hand: ["BT1-011"], deck: ["BT1-012", "BT1-013"] } });
    await setup.ready();
    const before = evaluateSearchPosition(trainingObservation(setup.state, 0));
    setup.state.players[1]!.hand[0]!.cardId = "BT1-014";
    setup.state.players[1]!.deck.reverse();
    expect(evaluateSearchPosition(trainingObservation(setup.state, 0))).toBe(before);
  });
});
