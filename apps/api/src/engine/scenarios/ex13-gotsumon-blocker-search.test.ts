import fixtureEx13GotsumonBlockerSearch from "./ex13-gotsumon-blocker-search.fixture.js";
import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import "../../cards/index.js";

describe("EX13 Gotsumon printed-Blocker dev scenario", () => {
  it("stages a turn draw before one main Blocker and two inherited-only Blockers", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(state, fixtureEx13GotsumonBlockerSearch, [BLUE_DECK, RED_DECK], true);

    const human = state.players[0]!;
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(3);
    expect(human.hand).toContainEqual(expect.objectContaining({ cardId: "EX13-047" }));
    expect(human.deck.slice(0, 4).map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT20-047", "BT19-069", "EX8-046"]);
    expect(human.security).toHaveLength(5);
  });
});
