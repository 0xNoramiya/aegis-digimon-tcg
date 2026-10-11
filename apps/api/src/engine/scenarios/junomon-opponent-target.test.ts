import fixtureJunomonOpponentTarget from "./junomon-opponent-target.fixture.js";
import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import "../../cards/index.js";

describe("arena-junomon-opponent-target dev scenario", () => {
  it("stages Junomon with only an opponent placement-cost target", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(state, fixtureJunomonOpponentTarget, [BLUE_DECK, RED_DECK], true);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(10);
    expect(state.players[0]!.hand).toContainEqual(expect.objectContaining({ cardId: "BT25-044" }));
    expect([...state.players[0]!.battleArea]).toEqual([]);
    expect([...state.players[1]!.battleArea]).toEqual([
      expect.objectContaining({ topCard: expect.objectContaining({ cardId: "BT1-009" }) }),
    ]);
    expect(state.players[0]!.security).toHaveLength(5);
    expect(state.players[1]!.security).toHaveLength(5);
  });
});
