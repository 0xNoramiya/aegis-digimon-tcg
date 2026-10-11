import fixtureEx13DeletionTriggerOrdering from "./ex13-deletion-trigger-ordering.fixture.js";
import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";

describe("EX13 deletion trigger ordering dev scenario", () => {
  it("stages KingEtemon over KingSukamon, EX13-028, Heat Viper, and two reveal groups", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(state, fixtureEx13DeletionTriggerOrdering, [BLUE_DECK, RED_DECK], true);

    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(5);
    expect(state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([
      "EX13-035",
      "EX13-028",
      "BT2-067",
    ]);
    expect(state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(["EX13-031"]);
    expect(state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT2-109");
    expect(state.players[0]!.deck.slice(0, 6).map(({ cardId }) => cardId)).toEqual([
      "EX13-028",
      "BT1-009",
      "BT1-014",
      "BT13-062",
      "BT1-009",
      "BT1-014",
    ]);
    expect(state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });
});
