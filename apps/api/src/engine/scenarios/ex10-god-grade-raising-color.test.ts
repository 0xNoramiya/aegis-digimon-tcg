import fixtureEx10GodGradeRaisingColor from "./ex10-god-grade-raising-color.fixture.js";
import { GameState, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import "../../cards/index.js";

describe("EX10 God Grade raising-area colour dev scenario", () => {
  it("stages Copipemon in breeding with Cyber Engage and God Grade Unleashed in hand", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layScenarioFixture(state, fixtureEx10GodGradeRaisingColor, [BLUE_DECK, RED_DECK], true);

    const human = state.players[0]!;
    expect(state.turnSeat).toBe(0);
    expect(state.memory).toBe(5);
    expect(human.breeding).toMatchObject({ inBreeding: true, topCard: { cardId: "BT26-084" } });
    expect(human.hand.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["EX10-070", "BT25-098"]));
    expect(human.battleArea).toHaveLength(0);
  });
});
